# Tangent CLI — Technical Documentation

> A terminal-based AI coding assistant with branching conversations, built in Go.

---

## What Is This?

Tangent CLI is a fully interactive terminal application that lets you have AI-powered coding conversations directly in your terminal. The core idea mirrors the Tangent web app: instead of one flat conversation, you can **branch** — open a side-by-side pane, seed it with context from the main thread, and ask a focused follow-up question without losing your original conversation.

The CLI is a separate frontend for the same idea. It runs locally, talks directly to AI provider APIs (Anthropic or OpenAI), and can read, write, and execute code in your project directory.

---

## CLI vs. Web App

This is the most important comparison to understand — they solve the same problem with completely different constraints.

| | Web App | CLI |
|---|---|---|
| **Language** | TypeScript / React | Go |
| **Rendering** | Browser DOM | Terminal (ANSI escape codes) |
| **AI backend** | Backend server → AI API | Direct API calls from the CLI |
| **State management** | React state / hooks | Bubbletea MVU (Elm architecture) |
| **Persistence** | Database (conversations saved) | In-memory only (session dies on exit) |
| **Branching** | Tree view, visual nodes | Split-pane (main / branch side by side) |
| **Selection** | Mouse click + drag to highlight | Keyboard navigation (v → ↑↓ → enter) |
| **File access** | None (chat only) | Full filesystem access via tools |
| **Auth** | Auth0 login | API key stored in ~/.tangent/config.json |
| **Distribution** | Deployed at tangentai.xyz | Compiled binary, runs anywhere |

**The key insight for interviews:** The web app is about *visualizing* branching conversations for thinking. The CLI is about *using* branching conversations as a coding workflow — you ask the agent to generate code, review the diff inline, select the specific lines you have a question about, and branch without ever leaving the terminal.

---

## Project Structure

```
frontend_cli/
├── main.go           # Entry point — wires up the TUI
├── tui/
│   └── tui.go        # All UI logic (~1000 lines)
├── agent/
│   ├── agent.go      # Agentic loop + tool execution
│   ├── tools.go      # Tool definitions (read, write, run, search)
│   ├── anthropic.go  # Anthropic API adapter
│   └── openai.go     # OpenAI API adapter
└── config/
    └── config.go     # Config load/save (~/.tangent/config.json)
```

---

## Architecture

### 1. The Bubbletea MVU Pattern

The TUI is built with [Bubbletea](https://github.com/charmbracelet/bubbletea), which implements the **Elm architecture** (also called MVU — Model, View, Update):

```
User Input → Update(model, message) → new Model → View(model) → terminal
                                          ↑
                                    (loop repeats)
```

- **Model** — a Go struct (`Model` in tui.go) that holds all application state: messages, viewport positions, selection state, loading state, etc. It is treated as **immutable** — `Update` receives a copy and returns a new copy.
- **Update** — a function that pattern-matches on incoming messages (`tea.Msg`) and returns an updated model plus optional side effects (`tea.Cmd`).
- **View** — a pure function that renders the current model to a string. Bubbletea handles writing it to the terminal.

**Why this matters for interviews:** This is the same unidirectional data flow pattern as Redux in React. State only ever flows one direction — you never mutate state directly. This makes the UI predictable and easy to reason about.

```go
// Every state change looks like this:
func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    // pattern match on message type
    // return new model + any async commands
}
```

### 2. Go Value Receivers and the Pointer Exception

In Bubbletea, the `Model` is passed by value (copy) to both `Update` and `View`. This means changes in `Update` don't affect the original — you return the modified copy.

However, some methods need to mutate the model in place *and* be called mid-function (before returning). For these, we take the address of the local copy:

```go
func (m *Model) resizeViewports() { ... }  // pointer receiver — mutates in place

// Inside Update (value receiver), called like this:
(&m).resizeViewports()  // take address of local m, mutate it, then return m
```

This pattern comes up in `refreshSelectView()` and `resizeViewports()`.

### 3. Async Communication with Channels

The AI calls are long-running — they can take seconds. Bubbletea requires that the UI never blocks. The solution is Go goroutines + channels:

```
TUI (main goroutine)
    │
    ├── starts goroutine: agent.Run(...)
    │       │ streams tool use messages → toolCh (chan string)
    │       │ blocks on confirm → confirmMsgCh / confirmResponseCh
    │       └── sends final result → sendDoneMsg
    │
    └── listens via tea.Cmd (waitForTool, waitForConfirm)
            └── each message becomes a tea.Msg → back into Update()
```

Three channels are used:
- **`toolCh`** — agent pushes a string every time it calls a tool ("reading main.go"). The TUI reads this and renders an action message in the feed.
- **`confirmMsgCh`** — agent pushes a confirmation request when it wants to write a file. The TUI reads this, shows the diff, and waits for y/n.
- **`confirmResponseCh`** — the TUI pushes `true` or `false` back to unblock the agent goroutine.

This is a clean example of using channels for bidirectional communication between a goroutine and the main event loop.

---

## The Agentic Loop

The agent runs a loop until the AI stops requesting tool calls:

```go
func (a *Agent) Run(history []Turn, userMsg string, ...) {
    history = append(history, Turn{Role: "user", Text: userMsg})

    for {
        text, calls, err := a.provider.Complete(systemPrompt, history, tools)
        history = append(history, Turn{Role: "assistant", Text: text, Calls: calls})

        if len(calls) == 0 {
            return text, history, nil  // AI is done
        }

        // execute each tool call, collect results
        results := executeCalls(calls)
        history = append(history, Turn{Role: "user", Results: results})
        // loop — send results back to AI
    }
}
```

Each iteration is one round-trip to the AI API. The AI can call multiple tools per round. This continues until the AI produces a response with no tool calls.

**Why this matters:** This is the pattern behind every AI coding assistant (Cursor, Copilot, Claude Code). The AI doesn't execute code — it requests tool calls, gets results, and reasons about what to do next.

---

## The Provider Pattern

Supporting multiple AI providers (Anthropic, OpenAI) without duplicating the agentic loop is done with a Go interface:

```go
type Provider interface {
    Complete(system string, history []Turn, tools []ToolDef) (text string, calls []ToolCall, err error)
}
```

Each provider (Anthropic, OpenAI) implements this interface by translating the neutral `Turn`/`ToolCall` types into their own wire format (different JSON shapes, different API endpoints, different auth headers). The agent loop only knows about the interface — it never imports Anthropic or OpenAI packages directly.

**Interview talking point:** This is the classic Strategy pattern. Adding a new AI provider means implementing one interface — the rest of the codebase is untouched.

---

## Tools and Security

The agent has five tools:

| Tool | What it does | Requires confirmation |
|---|---|---|
| `read_file` | Read any file in the working directory | No |
| `list_directory` | List directory contents | No |
| `search_files` | grep across the project | No |
| `write_file` | Overwrite or create a file | **Yes** |
| `run_command` | Execute a shell command | **Yes** |

Security is enforced at two levels:
1. **Path traversal prevention** — `safePath()` checks that every file path resolves to within the working directory. A path like `../../etc/passwd` is rejected.
2. **Confirmation gate** — destructive tools (`write_file`, `run_command`) block the agent goroutine and wait for explicit user approval before executing. The diff is rendered in the feed before the prompt appears.

---

## The Feed and Message Types

Every message in the conversation is typed:

```go
const (
    msgKindUser    // user's message — white bold, ▸ prefix
    msgKindAction  // tool activity — dim grey, · prefix  ("reading main.go")
    msgKindChat    // AI prose response — light grey
    msgKindCode    // code block — rounded border, syntax-colored
    msgKindDiff    // file diff — left bar border, +green/-red coloring
)
```

AI responses are parsed on receipt — ``` fences are split out into `msgKindCode` blocks, everything else becomes `msgKindChat`. This means diffs and code blocks are visually distinct from the moment they arrive.

---

## The Selection System

This is the most complex feature — it mirrors the web app's "click to highlight and branch" UX, translated to keyboard-only navigation.

**The two-level state machine:**

```
Normal mode
    │
    └── press v
            │
            ▼
    Message-select mode  (selecting = true, lineSelect = false)
    Navigate messages with ↑/↓
    Selected message: indented + colorSelect foreground
    All others: dimmed
            │
            └── press enter on a message
                        │
                        ▼
            Line-select mode  (selecting = true, lineSelect = true)
            Navigate lines with ↑/↓
            Press space to set anchor (start of range)
            Selected range: background highlight
            Status bar shows "line 3/12 · 4 lines selected"
                        │
                        └── press enter
                                    │
                                    ▼
                        Branch opens with selected text
                        prepended as context to next message
```

**Why this is interesting technically:** The selection state runs *above* the confirmation state in the key handler priority order. This means you can press `v` to enter select mode even while a confirmation dialog is active — and if you branch from within a confirmation, the system auto-denies the pending tool call before opening the branch.

**Comparison to the web app:** In the web app, you click and drag with a mouse. In the CLI, we replicate that with two keyboard modes. The anchor (`space`) is the equivalent of mousedown, navigating to the end of the range is dragging, and `enter` is mouseup + "branch from selection".

---

## Visual Design System

All colors and styles are defined as package-level variables. There are three named colors that control the entire selection experience:

```go
colorSelect   = lipgloss.Color("#87af87") // sage green — selected items
colorSelectBg = lipgloss.Color("#1a2e1a") // dark green — background on selected lines
colorDim      = lipgloss.Color("#585858") // grey — non-selected items in select mode
```

Changing `colorSelect` propagates to: the header mode indicator, the selected message text, code block borders, diff borders, the left selection bar, and the line-range highlight — all from one place.

**The three visual states of a message in select mode:**
1. **Selected** — indented 2 extra spaces, `colorSelect` foreground, normal brightness
2. **Dimmed** — normal indent, `colorDim` foreground/border, reduced contrast
3. **Line-selected** — background highlight `colorSelectBg`, foreground `colorSelect`, full-width highlight bar

---

## Key Libraries

| Library | Purpose |
|---|---|
| `charmbracelet/bubbletea` | MVU event loop, input handling |
| `charmbracelet/lipgloss` | ANSI styling — colors, borders, margins, padding |
| `charmbracelet/bubbles` | Pre-built UI components: `textarea`, `textinput`, `viewport` |
| `muesli/termenv` | Terminal capability detection (set to ANSI256 for compatibility) |

---

## Things to Talk About in Interviews

**"Tell me about a technically interesting project you've worked on."**
> Tangent CLI is a terminal AI coding assistant I built in Go using the Bubbletea MVU framework. The interesting part is the selection-to-branch workflow: I replicated the web app's click-and-drag text selection entirely through keyboard navigation — a two-level state machine where you first navigate between messages, then navigate within a message line by line, set an anchor, and branch with that selection as context. The tricky part was managing async state — the AI runs in a goroutine and communicates back through channels for tool updates and confirmation dialogs, all without blocking the UI event loop.

**"How did you handle asynchronous operations?"**
> Go channels. The agent runs in a goroutine and has three channels back to the UI: one for streaming tool activity messages, one for sending confirmation requests (like "I'm about to write this file, here's the diff"), and one for receiving the user's y/n response. Bubbletea's `Cmd` type wraps channel reads into the event loop cleanly.

**"How did you design for multiple AI providers?"**
> Provider interface. Anthropic and OpenAI have completely different API shapes — different JSON bodies, different auth headers, different ways of representing tool calls. I defined a `Provider` interface with a single `Complete` method that takes our neutral conversation types and returns text plus tool calls. Each provider implements the translation. The agent loop only sees the interface.

**"What design patterns did you use?"**
> MVU (same pattern as Redux) for UI state, Strategy pattern for the AI provider abstraction, and producer-consumer pattern with Go channels for the async agent-to-UI communication.
