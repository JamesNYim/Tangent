# TUI Architecture

## The Bubbletea Pattern

Tangent's UI is built with [Bubbletea](https://github.com/charmbracelet/bubbletea), a Go library that uses the **Elm architecture** (also called MVU — Model / Update / View). Every UI framework has some version of this idea; Bubbletea just makes it explicit.

There are three pieces:

```
Model  →  View renders it to a string
  ↑
Update receives a message and returns a new Model
```

In Go terms, these are three methods on the `Model` struct:

```go
func (m Model) Init() tea.Cmd          // called once at startup
func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd)  // called on every event
func (m Model) View() string           // called after every Update to re-render
```

Bubbletea calls `View()` after every `Update()` and writes the result to the terminal. You never manipulate the terminal directly — you just return a string.

**Value receivers matter:** `Update` takes `m Model` (a copy), mutates the copy, and returns it. This means you never accidentally share state between frames.

---

## The Model Struct

`Model` in `tui/tui.go` holds everything the UI needs to know:

```go
type Model struct {
    state   appState   // stateSetup or stateChat
    width   int
    height  int
    loading bool
    toolMsg string     // last tool status line

    // chat viewports
    mainVP    viewport.Model
    branchVP  viewport.Model

    // messages in each pane
    mainMsgs   []renderMsg
    branchMsgs []renderMsg

    // mode
    inputMode inputMode  // modeNormal or modeInsert

    // ... and more
}
```

---

## Messages

Everything that happens — a key press, a mouse click, a goroutine finishing — arrives as a `tea.Msg` in `Update`. The switch on message type is the heart of the update loop:

```go
func (m Model) updateChat(msg tea.Msg) (tea.Model, tea.Cmd) {
    switch msg := msg.(type) {
    case tea.KeyMsg:
        // handle keyboard
    case sendDoneMsg:
        // AI response arrived
    case toolUpdateMsg:
        // tool call in progress
    case confirmRequestMsg:
        // agent wants confirmation
    }
}
```

Custom message types (like `sendDoneMsg`) are just structs. Any goroutine can produce one by returning it from a `tea.Cmd`.

---

## Goroutines and Commands

Bubbletea is single-threaded — `Update` is never called concurrently. To do async work (like calling the AI API), you return a `tea.Cmd`, which is just a function that runs in a goroutine and returns a message when it finishes:

```go
return m, func() tea.Msg {
    aiText, history, err := agentRunner.Run(...)
    return sendDoneMsg{aiMsg: aiText, history: history, err: err}
}
```

When the function returns, Bubbletea calls `Update` with the result. This keeps all state mutation on one thread while letting network calls run in the background.

---

## Viewports

A `viewport.Model` (from Bubbletea's component library) is a scrollable window over a block of text. The pattern is:

1. Build the full rendered string with `renderMessages(...)`
2. Call `vp.SetContent(rendered)` to load it
3. Call `vp.GotoBottom()` if you want to scroll to the latest message
4. Call `vp.View()` in `View()` to get the visible slice

Viewport height is calculated in `resizeViewports()` whenever the terminal resizes:

```go
func (m *Model) resizeViewports() {
    headerH := 1
    inputH  := 3  // textarea + border
    hintH   := 1
    bodyH   := m.height - headerH - inputH - hintH
    m.mainVP.Height = bodyH
    // split width in half if branch is open
}
```

---

## Rendering Pipeline

When a new message arrives, the flow is:

```
append to []renderMsg
    → renderMessages() builds the full text string
    → vp.SetContent(string)
    → vp.GotoBottom()
    → View() calls vp.View() → terminal gets updated slice
```

`renderMessages` in `tui.go` iterates over `[]renderMsg`, switches on `msg.kind` (user, chat, code, diff, action, quote), and builds a styled string using Lipgloss. The viewport then handles scrolling over that string.
