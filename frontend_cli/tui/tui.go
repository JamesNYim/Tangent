package tui

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/bubbles/textarea"
	"github.com/charmbracelet/bubbles/textinput"
	"github.com/charmbracelet/bubbles/viewport"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"tangent-cli/agent"
	"tangent-cli/config"
)

// ── States ────────────────────────────────────────────────────────────────────

type appState int

const (
	stateSetup appState = iota
	stateChat
)

var providers = []string{"anthropic", "openai"}

// ── Styles ────────────────────────────────────────────────────────────────────

var (
	headerStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#87af87")). // sage green (256-color #108)
			Bold(true)

	branchHeaderStyle = lipgloss.NewStyle().
				Foreground(lipgloss.Color("#d7875f")). // amber (256-color #173)
				Bold(true)

	userStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#d7d7d7")) // off-white (256-color #188)

	aiStyle = lipgloss.NewStyle().
		Foreground(lipgloss.Color("#87af87")) // sage green (256-color #108)

	selectedStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#d7875f")). // amber (256-color #173)
			Bold(true)

	errorStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#ff8787")) // soft red (256-color #210)

	hintStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#878787")) // mid grey (256-color #102)

	dividerStyle = lipgloss.NewStyle().
			BorderLeft(true).
			BorderStyle(lipgloss.NormalBorder()).
			BorderForeground(lipgloss.Color("#585858")) // dark grey (256-color #240)

	previewStyle = lipgloss.NewStyle().
			BorderLeft(true).
			BorderStyle(lipgloss.NormalBorder()).
			BorderForeground(lipgloss.Color("#d7875f")). // amber border (256-color #173)
			PaddingLeft(1)

	diffAddStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#87af87")) // soft green — added lines

	diffRemoveStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#d75f5f")) // soft red — removed lines

	diffHunkStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#5f87af")) // muted blue — @@ hunk headers

	diffDefaultStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#878787")) // mid grey (256-color #102)
)

// ── Async message types ───────────────────────────────────────────────────────

type sendDoneMsg struct {
	userMsg  string
	aiMsg    string
	history  []agent.Turn
	isBranch bool
	err      error
}

type toolUpdateMsg string

type confirmRequestMsg struct {
	msg     string
	preview string
}

func waitForConfirm(ch chan confirmRequestMsg) tea.Cmd {
	return func() tea.Msg {
		req, ok := <-ch
		if !ok {
			return nil
		}
		return req
	}
}
func waitForTool(ch chan string) tea.Cmd {
	return func() tea.Msg {
		name, ok := <-ch
		if !ok {
			return nil
		}
		return toolUpdateMsg(name)
	}
}

// ── Rendered message ──────────────────────────────────────────────────────────

type renderMsg struct {
	role    string
	content string
}

// ── Model ─────────────────────────────────────────────────────────────────────

type Model struct {
	state   appState
	width   int
	height  int
	loading bool
	toolMsg string
	err     string

	// setup
	providerIdx  int
	setupInput   textinput.Model
	setupFocused int // 0=provider, 1=key

	// chat
	ag           *agent.Agent
	mainHistory  []agent.Turn
	mainMsgs     []renderMsg
	mainVP       viewport.Model

	// branch
	branchOpen    bool
	branchFocused bool
	branchHistory []agent.Turn
	branchMsgs    []renderMsg
	branchVP      viewport.Model

	// tool confirm
	confirming        bool
	confirmMsg        string
	confirmPreview    string
	confirmMsgCh      chan confirmRequestMsg
	confirmResponseCh chan bool

	ta     textarea.Model
	toolCh chan string


}

func New() Model {
	cfg, _ := config.Load()

	keyInput := textinput.New()
	keyInput.Placeholder = "sk-ant-..."
	keyInput.EchoMode = textinput.EchoPassword
	keyInput.EchoCharacter = '•'

	ta := textarea.New()
	ta.Placeholder = "Type a message...  /branch <question> to open branch pane"
	ta.Focus()
	ta.CharLimit = 0
	ta.SetHeight(3)
	ta.ShowLineNumbers = false

	m := Model{
		setupInput: keyInput,
		ta:         ta,
	}

	// Skip setup if already configured
	if cfg.IsReady() {
		if ag, err := agent.New(cfg.APIKeys[cfg.Provider], cfg.Provider, agent.DefaultModel(cfg.Provider)); err == nil {
			m.ag = ag
		}
		m.state = stateChat
	} else {
		m.state = stateSetup
		m.setupFocused = 0
	}

	return m
}

// ── Init ──────────────────────────────────────────────────────────────────────

func (m Model) Init() tea.Cmd {
	return textinput.Blink
}

// ── Update ────────────────────────────────────────────────────────────────────

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		m.resizeViewports()
		return m, nil
	case tea.KeyMsg:
		if msg.String() == "ctrl+c" {
			return m, tea.Quit
		}
	}

	switch m.state {
	case stateSetup:
		return m.updateSetup(msg)
	case stateChat:
		return m.updateChat(msg)
	}
	return m, nil
}

// ── Setup ─────────────────────────────────────────────────────────────────────

func (m Model) updateSetup(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "tab":
			m.setupFocused = (m.setupFocused + 1) % 2
			if m.setupFocused == 1 {
				m.setupInput.Focus()
			} else {
				m.setupInput.Blur()
			}
			return m, nil

		case "left", "right":
			if m.setupFocused == 0 {
				if msg.String() == "right" {
					m.providerIdx = (m.providerIdx + 1) % len(providers)
				} else {
					m.providerIdx = (m.providerIdx - 1 + len(providers)) % len(providers)
				}
			}
			return m, nil

		case "enter":
			apiKey := strings.TrimSpace(m.setupInput.Value())
			if apiKey == "" {
				m.err = "API key is required"
				return m, nil
			}
			provider := providers[m.providerIdx]
			cfg := &config.Config{
				Provider: provider,
				APIKeys:  map[string]string{provider: apiKey},
			}
			if err := config.Save(cfg); err != nil {
				m.err = fmt.Sprintf("could not save config: %v", err)
				return m, nil
			}
			ag, err := agent.New(apiKey, provider, agent.DefaultModel(provider))
			if err != nil {
				m.err = fmt.Sprintf("could not create agent: %v", err)
				return m, nil
			}
			m.ag = ag
			m.state = stateChat
			m.err = ""
			m.resizeViewports()
			return m, nil
		}
	}

	var cmd tea.Cmd
	m.setupInput, cmd = m.setupInput.Update(msg)
	return m, cmd
}

// ── Chat ──────────────────────────────────────────────────────────────────────

func (m Model) updateChat(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case toolUpdateMsg:
		m.toolMsg = string(msg)
		return m, waitForTool(m.toolCh)

	case confirmRequestMsg:
		m.confirming = true
		m.confirmMsg = msg.msg
		m.confirmPreview = msg.preview
		return m, nil

	case sendDoneMsg:
		m.loading = false
		m.toolMsg = ""
		m.toolCh = nil
		m.confirming = false
		m.confirmMsg = ""
		m.confirmPreview = ""
		m.confirmMsgCh = nil
		m.confirmResponseCh = nil
		if msg.err != nil {
			m.err = msg.err.Error()
			return m, nil
		}
		m.err = ""
		user := renderMsg{"user", msg.userMsg}
		ai := renderMsg{"ai", msg.aiMsg}

		if msg.isBranch {
			m.branchHistory = msg.history
			m.branchMsgs = append(m.branchMsgs, user, ai)
			m.branchVP.SetContent(renderMessages(m.branchMsgs, m.branchVP.Width))
			m.branchVP.GotoBottom()
		} else {
			m.mainHistory = msg.history
			m.mainMsgs = append(m.mainMsgs, user, ai)
			m.mainVP.SetContent(renderMessages(m.mainMsgs, m.mainVP.Width))
			m.mainVP.GotoBottom()
		}
		return m, nil

	case tea.KeyMsg:
		if m.confirming {
			switch msg.String() {
			case "y":
				m.confirming = false
				m.confirmResponseCh <- true
				return m, waitForConfirm(m.confirmMsgCh)
			case "n":
				m.confirming = false
				m.confirmResponseCh <- false
				return m, waitForConfirm(m.confirmMsgCh)
			}
			return m, nil
		}
		if m.loading {
			return m, nil
		}
		switch msg.String() {
		case "enter":
			input := strings.TrimSpace(m.ta.Value())
			if input == "" {
				return m, nil
			}
			m.ta.Reset()

			if strings.HasPrefix(input, "/branch ") {
				question := strings.TrimPrefix(input, "/branch ")
				if !m.branchOpen {
					m.branchOpen = true
					m.branchFocused = true
					// Seed branch with main context
					m.branchHistory = append([]agent.Turn{}, m.mainHistory...)
					m.resizeViewports()
				}
				m.loading = true
				m.toolCh = make(chan string, 10)
				history := m.branchHistory
				ag := m.ag
				toolCh := m.toolCh
				return m, tea.Batch(
					waitForTool(toolCh),
					func() tea.Msg {
						aiText, newHistory, err := ag.Run(history, question, func(msg string) { toolCh <- msg }, nil)
						close(toolCh)
						return sendDoneMsg{userMsg: question, aiMsg: aiText, history: newHistory, isBranch: true, err: err}
					},
				)
			}

			m.loading = true
			m.toolCh = make(chan string, 10)
			m.confirmMsgCh = make(chan confirmRequestMsg, 1)
			m.confirmResponseCh = make(chan bool, 1)
			history := m.mainHistory
			ag := m.ag
			toolCh := m.toolCh
			confirmMsgCh := m.confirmMsgCh
			confirmResponseCh := m.confirmResponseCh
			confirmFn := agent.ConfirmFn(func(name, msg, preview string) bool {
				confirmMsgCh <- confirmRequestMsg{msg: msg, preview: preview}
				return <-confirmResponseCh
			})
			return m, tea.Batch(
				waitForTool(toolCh),
				waitForConfirm(confirmMsgCh),
				func() tea.Msg {
					aiText, newHistory, err := ag.Run(history, input, func(msg string) { toolCh <- msg }, confirmFn)
					close(toolCh)
					close(confirmMsgCh)
					return sendDoneMsg{userMsg: input, aiMsg: aiText, history: newHistory, isBranch: false, err: err}
				},
			)

		case "tab":
			if m.branchOpen {
				m.branchFocused = !m.branchFocused
			}
			return m, nil

		case "ctrl+w":
			m.branchOpen = false
			m.branchFocused = false
			m.branchHistory = nil
			m.branchMsgs = []renderMsg{}
			m.resizeViewports()
			return m, nil
		}
	}

	var cmds []tea.Cmd
	var cmd tea.Cmd

	if key, ok := msg.(tea.KeyMsg); !ok || key.String() != "enter" {
		m.ta, cmd = m.ta.Update(msg)
		cmds = append(cmds, cmd)
	}

	m.mainVP, cmd = m.mainVP.Update(msg)
	cmds = append(cmds, cmd)

	if m.branchOpen {
		m.branchVP, cmd = m.branchVP.Update(msg)
		cmds = append(cmds, cmd)
	}

	return m, tea.Batch(cmds...)
}

// ── Resize ────────────────────────────────────────────────────────────────────

func (m *Model) resizeViewports() {
	headerH := 1
	inputH := 4
	bodyH := m.height - headerH - inputH
	if bodyH < 1 {
		bodyH = 1
	}

	if m.branchOpen {
		mainW := m.width/2 - 1
		branchW := m.width - mainW - 1
		m.mainVP = viewport.New(mainW, bodyH)
		m.mainVP.SetContent(renderMessages(m.mainMsgs, mainW))
		m.branchVP = viewport.New(branchW, bodyH)
		m.branchVP.SetContent(renderMessages(m.branchMsgs, branchW))
	} else {
		m.mainVP = viewport.New(m.width, bodyH)
		m.mainVP.SetContent(renderMessages(m.mainMsgs, m.width))
	}
	m.ta.SetWidth(m.width - 2)
}

// ── Views ─────────────────────────────────────────────────────────────────────

func (m Model) View() string {
	switch m.state {
	case stateSetup:
		return m.setupView()
	case stateChat:
		return m.chatView()
	}
	return ""
}

func (m Model) setupView() string {
	var b strings.Builder
	b.WriteString("\n\n  " + headerStyle.Render("── Tangent ─────────────────────") + "\n\n")

	// Provider selector
	b.WriteString("  provider:\n  ")
	for i, p := range providers {
		if i == m.providerIdx {
			b.WriteString(selectedStyle.Render("> "+p) + "  ")
		} else {
			b.WriteString(hintStyle.Render("  "+p) + "  ")
		}
	}
	b.WriteString("\n\n")

	// API key input
	b.WriteString("  API key:\n  " + m.setupInput.View() + "\n\n")

	b.WriteString(hintStyle.Render("  tab · switch field   ←/→ · change provider   enter · save   ctrl+c · quit"))

	if m.err != "" {
		b.WriteString("\n\n  " + errorStyle.Render(m.err))
	}
	return b.String()
}

func (m Model) chatView() string {
	var header string
	if m.branchOpen {
		mainH := headerStyle.Render("── main")
		branchH := branchHeaderStyle.Render("── branch")
		gap := m.width/2 - lipgloss.Width(mainH) - 1
		if gap < 1 {
			gap = 1
		}
		header = mainH + strings.Repeat(" ", gap) + branchH
	} else {
		header = headerStyle.Render("── Tangent")
	}

	var body string
	if m.branchOpen {
		body = lipgloss.JoinHorizontal(lipgloss.Top,
			m.mainVP.View(),
			dividerStyle.Render(m.branchVP.View()),
		)
	} else {
		body = m.mainVP.View()
	}

	hint := "enter · send   /branch <question> · open branch   tab · switch pane   ctrl+w · close branch   ctrl+c · quit"
	if m.confirming {
		hint = "  " + m.confirmMsg + "   y · confirm   n · deny"
	} else if m.loading {
		if m.toolMsg != "" {
			hint = "  " + m.toolMsg + "..."
		} else {
			hint = "  thinking..."
		}
	}
	if m.err != "" {
		hint = m.err
	}

	parts := []string{header, body}
	if m.confirming && m.confirmPreview != "" {
		parts = append(parts, previewStyle.Render(renderDiff(m.confirmPreview)))
	}
	parts = append(parts, m.ta.View(), hintStyle.Render(hint))
	return lipgloss.JoinVertical(lipgloss.Left, parts...)
}

// ── Render helpers ────────────────────────────────────────────────────────────

func renderDiff(diff string) string {
	var b strings.Builder
	for _, line := range strings.Split(diff, "\n") {
		switch {
		case strings.HasPrefix(line, "+"):
			b.WriteString(diffAddStyle.Render(line) + "\n")
		case strings.HasPrefix(line, "-"):
			b.WriteString(diffRemoveStyle.Render(line) + "\n")
		case strings.HasPrefix(line, "@@"):
			b.WriteString(diffHunkStyle.Render(line) + "\n")
		default:
			b.WriteString(diffDefaultStyle.Render(line) + "\n")
		}
	}
	return b.String()
}

func renderMessages(msgs []renderMsg, width int) string {
	if width < 20 {
		width = 20
	}
	var b strings.Builder
	for _, msg := range msgs {
		prefix := "     ai: "
		style := aiStyle
		if msg.role == "user" {
			prefix = "    you: "
			style = userStyle
		}
		indent := strings.Repeat(" ", len(prefix))
		lineW := width - len(prefix)
		if lineW < 10 {
			lineW = 10
		}

		words := strings.Fields(msg.content)
		line := ""
		firstLine := true
		for _, w := range words {
			if line == "" {
				line = w
			} else if len(line)+1+len(w) <= lineW {
				line += " " + w
			} else {
				if firstLine {
					b.WriteString(style.Render(prefix+line) + "\n")
					firstLine = false
				} else {
					b.WriteString(indent + line + "\n")
				}
				line = w
			}
		}
		if line != "" {
			if firstLine {
				b.WriteString(style.Render(prefix+line) + "\n")
			} else {
				b.WriteString(indent + line + "\n")
			}
		}
		b.WriteString("\n")
	}
	return b.String()
}
