package tui

import (
	"strings"

	"github.com/charmbracelet/bubbles/textarea"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

type inputBar struct {
	textarea     textarea.Model
	history      []string
	historyIdx   int
	historyDraft string
}

func newInputBar() inputBar {
	textArea := textarea.New()
	textArea.Placeholder = "Type a message..."
	textArea.CharLimit = 0
	textArea.SetHeight(1)
	textArea.ShowLineNumbers = false

	// INSERT mode: green border, visible cursor
	textArea.FocusedStyle.Base = lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(lipgloss.Color("#49a352")).
		Padding(0, 1)
	textArea.FocusedStyle.Placeholder = lipgloss.NewStyle().Foreground(lipgloss.Color("#878787"))
	textArea.FocusedStyle.Text = lipgloss.NewStyle().Foreground(lipgloss.Color("#d7d7d7"))
	textArea.FocusedStyle.Prompt = lipgloss.NewStyle().Foreground(lipgloss.Color("#49a352"))
	textArea.FocusedStyle.CursorLine = lipgloss.NewStyle()

	// NORMAL mode: dim border, no cursor
	textArea.BlurredStyle.Base = lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(lipgloss.Color("#585858")).
		Padding(0, 1)
	textArea.BlurredStyle.Placeholder = lipgloss.NewStyle().Foreground(lipgloss.Color("#585858"))
	textArea.BlurredStyle.Text = lipgloss.NewStyle().Foreground(lipgloss.Color("#878787"))
	textArea.BlurredStyle.CursorLine = lipgloss.NewStyle()

	return inputBar{
		textarea:   textArea,
		historyIdx: -1,
	}
}

func (bar *inputBar) Focus() tea.Cmd {
	return bar.textarea.Focus()
}

func (bar *inputBar) Blur() {
	bar.textarea.Blur()
}

// Update handles key events for the input bar.
// Returns submitted (non-empty when user pressed enter with content),
// handled (true when the key was consumed by the input bar),
// and teaCmd (any async command to pass back to Bubbletea).
func (bar *inputBar) Update(msg tea.Msg) (submitted string, handled bool, teaCmd tea.Cmd) {
	keyMsg, isKey := msg.(tea.KeyMsg)
	if !isKey {
		bar.textarea, teaCmd = bar.textarea.Update(msg)
		return "", false, teaCmd
	}

	switch keyMsg.String() {
	case "up":
		if len(bar.history) > 0 && bar.textarea.Line() == 0 {
			// Navigate history only when there is typed content (entering history nav)
			// or we are already inside history navigation (historyIdx >= 0).
			// An empty textarea with no active navigation means the user is in read
			// mode — let the key fall through so the viewport can scroll instead.
			// Also fall through when already at the oldest entry (historyIdx == 0)
			// so the user can keep scrolling past the beginning of their history.
			if bar.historyIdx == -1 && bar.textarea.Value() != "" {
				bar.historyDraft = bar.textarea.Value()
				bar.historyIdx = len(bar.history) - 1
				bar.textarea.SetValue(bar.history[bar.historyIdx])
				return "", true, nil
			} else if bar.historyIdx > 0 {
				bar.historyIdx--
				bar.textarea.SetValue(bar.history[bar.historyIdx])
				return "", true, nil
			}
			// historyIdx == -1 with empty textarea, or historyIdx == 0 (at oldest):
			// fall through so the viewport receives the up key and scrolls.
		}
	case "down":
		if bar.historyIdx != -1 {
			if bar.historyIdx < len(bar.history)-1 {
				bar.historyIdx++
				bar.textarea.SetValue(bar.history[bar.historyIdx])
			} else {
				bar.historyIdx = -1
				bar.textarea.SetValue(bar.historyDraft)
				bar.historyDraft = ""
			}
			return "", true, nil
		}
		// historyIdx == -1: not navigating history — fall through so the viewport scrolls.
	case "enter":
		input := strings.TrimSpace(bar.textarea.Value())
		if input == "" {
			return "", true, nil
		}
		bar.textarea.Reset()
		bar.history = append(bar.history, input)
		bar.historyIdx = -1
		bar.historyDraft = ""
		return input, true, nil
	}

	bar.textarea, teaCmd = bar.textarea.Update(msg)
	return "", false, teaCmd
}

func (bar *inputBar) SetWidth(width int) {
	bar.textarea.SetWidth(width)
}

func (bar inputBar) View() string {
	return bar.textarea.View()
}
