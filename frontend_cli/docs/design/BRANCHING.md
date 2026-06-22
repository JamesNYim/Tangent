# Branch System

## What a Branch Is

A branch is a second conversation that runs alongside the main thread. It's seeded with the same history as main — so the AI already knows everything that happened — but any messages you send in the branch don't affect the main thread.

This lets you explore a tangent (ask "what if we did it differently?" or "explain this specific part") without polluting your main conversation.

---

## The Split Viewport Layout

When a branch is open, `resizeViewports` splits the available width in half and gives each pane its own `viewport.Model`:

```go
halfW := m.width / 2
m.mainVP.Width  = halfW - 1
m.branchVP.Width = halfW - 1
```

The left pane shows `mainMsgs`, the right pane shows `branchMsgs`. A divider is rendered between them using Lipgloss's `BorderLeft` style.

`m.branchFocused` tracks which pane is active. `tab` toggles it. Scroll events and key inputs are routed to the focused pane only.

---

## Opening a Branch

**From SELECT / LINE SELECT** (the primary flow):

1. User presses `v` in NORMAL → enters SELECT mode, last selectable message is highlighted
2. User presses `enter` → enters LINE SELECT for that message
3. User moves the cursor, optionally anchors a range with `space`
4. User presses `enter` — this fires the branch-open sequence:
   - The selected lines are captured as `branchContext` and as a `msgKindQuote` entry added to `branchMsgs`
   - `branchOpen = true`, `branchFocused = true`
   - `branchHistory` is seeded from a copy of `mainHistory`
   - The mode switches to INSERT (`m.input.Focus()` returned as a cmd)

The user lands in INSERT mode in the branch pane with the context already visible as the first entry in the feed.

**From a slash command:**

Typing `/branch your question here` in INSERT mode sends the message directly to the branch without needing to select context first.

---

## Context Quoting

The selected lines are stored in two places:

1. **`m.branchContext`** (string) — prepended to the agent's actual question when the user sends a message, so the LLM receives: `"Regarding:\n\n<context>\n\n<user message>"`
2. **A `msgKindQuote` entry in `branchMsgs`** — shown in the branch feed so the user can see what context they selected

When the user sends their message, `m.branchContext` is consumed (cleared) and only the user's text is displayed in the feed. The context was only needed for the agent's prompt.

```go
if m.branchContext != "" {
    agentQ = "Regarding:\n\n" + m.branchContext + "\n\n" + displayQ
    m.branchContext = ""
}
```

This keeps the feed readable — you see the context quote once at the top, then your message, then the AI's response.

---

## Closing a Branch

`ctrl+w` closes the branch. If `branchMsgs` is empty (no conversation yet), it closes immediately. If there are messages, it sets `m.closingBranch = true` and shows a CLOSE confirmation prompt.

Confirming with `y`:
- `branchOpen`, `branchFocused`, `closingBranch` are all reset to false/zero
- `branchHistory`, `branchMsgs`, `branchContext` are cleared
- `resizeViewports()` is called to restore the single-pane layout

Cancelling with `n`: `closingBranch = false`, the branch remains open.
