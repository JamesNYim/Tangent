# Modal Input

## The Problem

Without modes, every key either goes to the text input or triggers a shortcut — and the two conflict. Pressing `v` to start a selection would type "v" into the input box. Pressing `↑` to scroll would move the text cursor. There's no clean way to have a rich keyboard UI and a free-form text box at the same time without partitioning keys by mode.

The solution is the same one Vim uses: the keyboard has different meanings depending on which mode you're in.

---

## The Mode Type

In Go, you define an enum using `iota` inside a `const` block:

```go
type inputMode int

const (
    modeNormal inputMode = iota  // 0
    modeInsert                   // 1
)
```

`inputMode` is just an `int` under the hood, but naming the type means the compiler won't let you accidentally assign an arbitrary integer to it. The `Model` struct holds one field:

```go
inputMode inputMode
```

---

## Key Event Routing

All keyboard events arrive in `updateChat` as `tea.KeyMsg`. The routing logic works in layers, checked in order:

```
1. Universal keys (tab, ctrl+w) — always fire regardless of mode
2. SELECT / LINE SELECT mode — consumes arrow keys and enter for navigation
3. CONFIRM mode — y/n/v only
4. closingBranch — y/n only
5. loading — all keys blocked
6. modeNormal — i/enter → INSERT, v → SELECT, ↑↓ → scroll
7. modeInsert — esc → NORMAL, everything else → inputBar
```

Checking universal keys first (before any mode check) means `tab` and `ctrl+w` always work, even during loading or while confirming a tool.

---

## The Input Bar

`tui/input.go` wraps Bubbletea's `textarea` component. The textarea has two visual states:

- **Focused** (INSERT mode): green rounded border, visible cursor
- **Blurred** (NORMAL mode): gray rounded border, no cursor

Switching modes calls `m.input.Focus()` or `m.input.Blur()` to change the visual state:

```go
case "i", "enter":
    m.inputMode = modeInsert
    return m, m.input.Focus()  // Focus() returns a tea.Cmd

case "esc":
    m.inputMode = modeNormal
    m.input.Blur()
    return m, nil
```

`Focus()` returns a `tea.Cmd` because focusing a textarea may need to trigger a cursor blink animation — Bubbletea needs to schedule that.

---

## History Navigation

`inputBar` keeps a slice of every sent message and a cursor into it:

```go
history    []string
historyIdx int     // -1 means "not navigating history"
historyDraft string // saves the current draft when you enter history nav
```

Pressing `↑` in INSERT mode:
1. If `historyIdx == -1`: save the current draft, jump to the newest history entry
2. If `historyIdx > 0`: go back one entry
3. If `historyIdx == 0`: already at the oldest entry, do nothing (key is swallowed)

Pressing `↓` walks forward, and when you pass the newest entry it restores the saved draft and sets `historyIdx = -1`.

Keys that `inputBar.Update` doesn't handle return `handled = false`. In INSERT mode, unhandled keys that aren't `↑`/`↓` pass to the viewport (e.g. for mouse wheel). Arrow keys are always swallowed in INSERT mode so they never accidentally scroll the viewport.

---

## Mode Badge

The current mode is rendered as a colored tag at the left of the hint bar:

```go
normalModeBadge  = lipgloss.NewStyle().Background("#585858").Foreground("#ffffff")...
insertModeBadge  = lipgloss.NewStyle().Background("#49a352").Foreground("#000000")...
selectModeBadge  = lipgloss.NewStyle().Background("#d78700").Foreground("#000000")...
confirmModeBadge = lipgloss.NewStyle().Background("#ff8787").Foreground("#000000")...
```

The hint text to the right of the badge changes based on which mode is active, so the user always sees exactly which keys are available.
