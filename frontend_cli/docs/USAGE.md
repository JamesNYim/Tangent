# Usage Guide

## Setup

Build and run:

```sh
cd frontend_cli
go build -o tangent-cli .
./tangent-cli
```

On first launch you'll see the setup screen. Use `←`/`→` to switch between Anthropic and OpenAI, then `tab` to move to the API key field and type your key. Press `enter` to save and start chatting.

Your config is saved to `~/.tangent/config.json` and loaded automatically on future runs.

---

## Modes

Tangent uses vim-style modes so every key has a clear, predictable role. The current mode is always shown in the hint bar at the bottom of the screen.

### NORMAL

The default mode. The input bar is inactive.

| Key | Action |
|---|---|
| `i` or `enter` | Switch to INSERT mode |
| `v` | Switch to SELECT mode |
| `↑` / `↓` | Scroll the focused pane |
| `tab` | Switch focus between main and branch pane |
| `ctrl+w` | Close branch (prompts if it has messages) |
| `ctrl+c` | Quit |

### INSERT

The input bar is active — type your message and press `enter` to send.

| Key | Action |
|---|---|
| `enter` | Send message |
| `esc` | Return to NORMAL mode |
| `↑` / `↓` | Navigate message history |
| `tab` | Switch pane (without leaving INSERT) |
| `ctrl+w` | Close branch |

### SELECT

Navigate the messages in the focused pane.

| Key | Action |
|---|---|
| `↑` / `↓` | Move between messages |
| `enter` | Enter LINE SELECT for the highlighted message |
| `esc` | Cancel, return to NORMAL |

### LINE SELECT

Pick specific lines within a message to use as context for a branch.

| Key | Action |
|---|---|
| `↑` / `↓` | Move the cursor line |
| `space` | Set/move the selection anchor |
| `enter` | Open a branch with the selected lines as context |
| `esc` | Return to SELECT mode |

### CONFIRM

Appears when the agent wants to write a file or run a shell command. The diff or command is shown in the chat feed above.

| Key | Action |
|---|---|
| `y` | Approve and execute |
| `n` | Deny |
| `v` | Enter SELECT mode to branch on the diff |

---

## Branching

A branch is a parallel conversation that inherits your main history as its starting point. It lets you explore a direction without disrupting the main thread.

**Open a branch from SELECT / LINE SELECT:**
1. Press `v` in NORMAL mode to enter SELECT
2. Navigate to a message with `↑`/`↓`
3. Press `enter` to enter LINE SELECT
4. Move the cursor to the lines you want, use `space` to anchor a range
5. Press `enter` — the branch opens with those lines shown as context at the top

**Open a branch with a slash command:**
Type `/branch your question here` in INSERT mode. The branch opens immediately without selecting context.

**Switch between panes:** `tab`  
**Close the branch:** `ctrl+w` (asks for confirmation if the branch has messages)

---

## What the agent shows while working

Every tool call produces a dim `·` line in the feed so you can follow along:

```
  · 1823 in · 47 out
  · searching for "useState"
  · reading src/components/App.tsx
  · 3104 in · 312 out
  · writing src/components/App.tsx
```

- **`N in · N out`** — token counts for that LLM round-trip
- **`reading / listing / writing path`** — file operations
- **`searching path for "pattern"`** — grep search
- **`$ command`** — shell command (always requires confirmation)
