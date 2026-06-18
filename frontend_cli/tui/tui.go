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

// ── Colors ────────────────────────────────────────────────────────────────────

var (
	colorSelect   = lipgloss.Color("#87af87") // selection highlight
	colorSelectBg = lipgloss.Color("#1a2e1a") // background tint behind selected text
	colorDim      = lipgloss.Color("#585858") // dimmed borders/text in select mode
)

// ── Styles ────────────────────────────────────────────────────────────────────

var (
	headerStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#d7875f")).
			Bold(true)

	branchHeaderStyle = lipgloss.NewStyle().
				Foreground(lipgloss.Color("#d7875f")).
				Bold(true)

	userMsgStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#ffffff")).
			Bold(true)

	actionMsgStyle = lipgloss.NewStyle().
			Foreground(colorDim)

	chatMsgStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#d7d7d7"))

	codeMsgStyle = lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(colorDim).
			Foreground(lipgloss.Color("#ff0000")).
			Padding(0, 1)

	selectedStyle = lipgloss.NewStyle().
			Foreground(colorSelect).
			Background(colorSelectBg).
			Bold(true)

	errorStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#ff8787"))

	hintStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#878787"))

	dividerStyle = lipgloss.NewStyle().
			BorderLeft(true).
			BorderStyle(lipgloss.NormalBorder()).
			BorderForeground(colorDim)

	previewStyle = lipgloss.NewStyle().
			BorderLeft(true).
			BorderStyle(lipgloss.NormalBorder()).
			BorderForeground(colorDim).
			PaddingLeft(1)

	diffAddStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#87af87"))

	diffRemoveStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#d75f5f"))

	diffHunkStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#5f87af"))

	diffDefaultStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#878787"))

	lineRangeStyle = lipgloss.NewStyle().
			Foreground(colorSelect).
			Background(colorSelectBg)

	selectBarStyle = lipgloss.NewStyle().
			BorderLeft(true).
			BorderStyle(lipgloss.ThickBorder()).
			BorderForeground(colorSelect).
			PaddingLeft(1)

	codeLineStyle = lipgloss.NewStyle().
			Foreground(diffAddStyle.GetForeground())
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

type lineSelectInfo struct {
	msgIdx int
	cursor int
	anchor int // -1 = no anchor yet
}

type msgKind int

const (
	msgKindUser   msgKind = iota // punchy user prompt
	msgKindAction                // "reading file..." tool status
	msgKindChat                  // AI prose response
	msgKindCode                  // code block / generated content
	msgKindDiff                  // diff preview from a file write confirmation
)

type renderMsg struct {
	kind    msgKind
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

	ta            textarea.Model
	toolCh        chan string
	loadingBranch bool

	// input history (↑/↓ to cycle)
	inputHistory []string
	historyIdx   int
	historyDraft string

	// branch close confirmation
	closingBranch bool

	// select mode — navigate messages with ↑/↓, branch on selection with enter
	selecting       bool
	selectIdx       int  // index into the active pane's msgs (-1 = none)
	selectingBranch bool // navigating branchMsgs vs mainMsgs
	branchContext   string

	// line-select sub-mode (entered from message-select via enter)
	lineSelect  bool
	lineCursor  int
	lineAnchor  int // -1 = no anchor
}

func New() Model {
	keyInput := textinput.New()
	keyInput.Placeholder = "sk-ant-..."
	keyInput.EchoMode = textinput.EchoPassword
	keyInput.EchoCharacter = '•'

	ta := textarea.New()
	ta.Placeholder = "Type a message..."
	ta.Focus()
	ta.CharLimit = 0
	ta.SetHeight(3)
	ta.ShowLineNumbers = false

	m := Model{
		setupInput: keyInput,
		ta:         ta,
		historyIdx: -1,
		selectIdx:  -1,
		lineAnchor: -1,
	}

	cfg, err := config.Load()
	if err != nil {
		m.state = stateSetup
		m.err = fmt.Sprintf("config error: %v", err)
		return m
	}

	if cfg.IsReady() {
		ag, err := agent.New(cfg.APIKeys[cfg.Provider], cfg.Provider, agent.DefaultModel(cfg.Provider))
		if err != nil {
			m.state = stateSetup
			m.err = fmt.Sprintf("could not start agent: %v", err)
			return m
		}
		m.ag = ag
		m.state = stateChat
	} else {
		m.state = stateSetup
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
		action := renderMsg{kind: msgKindAction, content: string(msg)}
		if m.loadingBranch {
			m.branchMsgs = append(m.branchMsgs, action)
			m.branchVP.SetContent(renderMessages(m.branchMsgs, m.branchVP.Width, -1, nil))
			m.branchVP.GotoBottom()
		} else {
			m.mainMsgs = append(m.mainMsgs, action)
			m.mainVP.SetContent(renderMessages(m.mainMsgs, m.mainVP.Width, -1, nil))
			m.mainVP.GotoBottom()
		}
		return m, waitForTool(m.toolCh)

	case confirmRequestMsg:
		m.confirming = true
		m.confirmMsg = msg.msg
		m.confirmPreview = msg.preview
		if msg.preview != "" {
			diff := renderMsg{kind: msgKindDiff, content: msg.preview}
			if m.loadingBranch {
				m.branchMsgs = append(m.branchMsgs, diff)
				m.branchVP.SetContent(renderMessages(m.branchMsgs, m.branchVP.Width, -1, nil))
				m.branchVP.GotoBottom()
			} else {
				m.mainMsgs = append(m.mainMsgs, diff)
				m.mainVP.SetContent(renderMessages(m.mainMsgs, m.mainVP.Width, -1, nil))
				m.mainVP.GotoBottom()
			}
		}
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
		m.loadingBranch = false
		aiMsgs := parseAIResponse(msg.aiMsg)

		if msg.isBranch {
			m.branchHistory = msg.history
			m.branchMsgs = append(m.branchMsgs, aiMsgs...)
			m.branchVP.SetContent(renderMessages(m.branchMsgs, m.branchVP.Width, -1, nil))
			m.branchVP.GotoBottom()
		} else {
			m.mainHistory = msg.history
			m.mainMsgs = append(m.mainMsgs, aiMsgs...)
			m.mainVP.SetContent(renderMessages(m.mainMsgs, m.mainVP.Width, -1, nil))
			m.mainVP.GotoBottom()
		}
		return m, nil

	case tea.KeyMsg:
		// ── Select mode (runs even during confirming) ─────────────────────────
		if m.selecting {
			msgs := m.mainMsgs
			if m.selectingBranch {
				msgs = m.branchMsgs
			}

			// Line-select sub-mode
			if m.lineSelect && m.selectIdx >= 0 && m.selectIdx < len(msgs) {
				lines := strings.Split(strings.TrimRight(msgs[m.selectIdx].content, "\n"), "\n")
				switch msg.String() {
				case "up":
					if m.lineCursor > 0 {
						m.lineCursor--
						(&m).refreshSelectView()
					}
				case "down":
					if m.lineCursor < len(lines)-1 {
						m.lineCursor++
						(&m).refreshSelectView()
					}
				case " ":
					if m.lineAnchor == -1 {
						m.lineAnchor = m.lineCursor
					} else {
						m.lineAnchor = -1
					}
					(&m).refreshSelectView()
				case "enter":
					lo, hi := m.lineCursor, m.lineCursor
					if m.lineAnchor >= 0 {
						lo, hi = m.lineAnchor, m.lineCursor
						if lo > hi {
							lo, hi = hi, lo
						}
					}
					m.branchContext = strings.Join(lines[lo:hi+1], "\n")
					m.selecting = false
					m.lineSelect = false
					m.selectIdx = -1
					m.lineCursor = 0
					m.lineAnchor = -1
					(&m).refreshSelectView()
					if m.confirming {
						m.confirming = false
						m.confirmResponseCh <- false
					}
					if !m.branchOpen {
						m.branchOpen = true
						m.branchFocused = true
						m.branchHistory = append([]agent.Turn{}, m.mainHistory...)
						m.resizeViewports()
					} else {
						m.branchFocused = true
					}
				case "escape":
					m.lineSelect = false
					m.lineCursor = 0
					m.lineAnchor = -1
					(&m).refreshSelectView()
				}
				return m, nil
			}

			// Message-select mode
			switch msg.String() {
			case "up":
				idx := m.selectIdx - 1
				for idx >= 0 && msgs[idx].kind == msgKindAction {
					idx--
				}
				if idx >= 0 {
					m.selectIdx = idx
					(&m).refreshSelectView()
				}
			case "down":
				idx := m.selectIdx + 1
				for idx < len(msgs) && msgs[idx].kind == msgKindAction {
					idx++
				}
				if idx < len(msgs) {
					m.selectIdx = idx
					(&m).refreshSelectView()
				}
			case "enter":
				// Enter line-select mode for this message
				if m.selectIdx >= 0 && m.selectIdx < len(msgs) {
					m.lineSelect = true
					m.lineCursor = 0
					m.lineAnchor = -1
					(&m).refreshSelectView()
				}
			case "escape", "v":
				m.selecting = false
				m.lineSelect = false
				m.selectIdx = -1
				m.lineCursor = 0
				m.lineAnchor = -1
				(&m).refreshSelectView()
			}
			return m, nil
		}

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
			case "v":
				if idx := lastSelectableIdx(m.mainMsgs); idx >= 0 {
					m.selecting = true
					m.selectingBranch = false
					m.selectIdx = idx
					(&m).refreshSelectView()
				}
			}
			return m, nil
		}
		if m.closingBranch {
			switch msg.String() {
			case "y":
				m.closingBranch = false
				m.branchOpen = false
				m.branchFocused = false
				m.branchHistory = nil
				m.branchMsgs = []renderMsg{}
				m.resizeViewports()
			case "n", "escape":
				m.closingBranch = false
			}
			return m, nil
		}

		if m.loading {
			return m, nil
		}
		switch msg.String() {
		case "v":
			msgs := m.mainMsgs
			isBranch := m.branchOpen && m.branchFocused
			if isBranch {
				msgs = m.branchMsgs
			}
			if idx := lastSelectableIdx(msgs); idx >= 0 {
				m.selecting = true
				m.selectingBranch = isBranch
				m.selectIdx = idx
				(&m).refreshSelectView()
			}
			return m, nil
		case "up":
			if len(m.inputHistory) > 0 && m.ta.Line() == 0 {
				if m.historyIdx == -1 {
					m.historyDraft = m.ta.Value()
					m.historyIdx = len(m.inputHistory) - 1
				} else if m.historyIdx > 0 {
					m.historyIdx--
				}
				m.ta.SetValue(m.inputHistory[m.historyIdx])
				return m, nil
			}
		case "down":
			if m.historyIdx != -1 {
				if m.historyIdx < len(m.inputHistory)-1 {
					m.historyIdx++
					m.ta.SetValue(m.inputHistory[m.historyIdx])
				} else {
					m.historyIdx = -1
					m.ta.SetValue(m.historyDraft)
					m.historyDraft = ""
				}
				return m, nil
			}
		case "enter":
			input := strings.TrimSpace(m.ta.Value())
			if input == "" {
				return m, nil
			}
			m.ta.Reset()
			m.inputHistory = append(m.inputHistory, input)
			m.historyIdx = -1
			m.historyDraft = ""

			// Route to branch if: explicit /branch prefix, or branch pane is focused
			isBranchMsg := strings.HasPrefix(input, "/branch ") || (m.branchOpen && m.branchFocused)

			if isBranchMsg {
				// Resolve the user-visible question (strip /branch prefix if present)
				displayQ := input
				if strings.HasPrefix(input, "/branch ") {
					displayQ = strings.TrimPrefix(input, "/branch ")
				}
				// Build agent message — prepend selection context if set
				agentQ := displayQ
				if m.branchContext != "" {
					agentQ = "Regarding:\n\n" + m.branchContext + "\n\n" + displayQ
					m.branchContext = ""
					(&m).resizeViewports()
				}
				if !m.branchOpen {
					m.branchOpen = true
					m.branchFocused = true
					m.branchHistory = append([]agent.Turn{}, m.mainHistory...)
					m.resizeViewports()
				}
				m.branchMsgs = append(m.branchMsgs, renderMsg{kind: msgKindUser, content: displayQ})
				m.branchVP.SetContent(renderMessages(m.branchMsgs, m.branchVP.Width, -1, nil))
				m.branchVP.GotoBottom()
				m.loading = true
				m.loadingBranch = true
				m.toolCh = make(chan string, 10)
				history := m.branchHistory
				ag := m.ag
				toolCh := m.toolCh
				q := agentQ
				return m, tea.Batch(
					waitForTool(toolCh),
					func() tea.Msg {
						aiText, newHistory, err := ag.Run(history, q, func(msg string) { toolCh <- msg }, nil)
						close(toolCh)
						return sendDoneMsg{userMsg: displayQ, aiMsg: aiText, history: newHistory, isBranch: true, err: err}
					},
				)
			}

			m.mainMsgs = append(m.mainMsgs, renderMsg{kind: msgKindUser, content: input})
			m.mainVP.SetContent(renderMessages(m.mainMsgs, m.mainVP.Width, -1, nil))
			m.mainVP.GotoBottom()
			m.loading = true
			m.loadingBranch = false
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
			if m.branchOpen {
				if len(m.branchMsgs) > 0 {
					m.closingBranch = true
				} else {
					m.branchOpen = false
					m.branchFocused = false
					m.branchHistory = nil
					m.resizeViewports()
				}
			}
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
	if m.branchContext != "" {
		inputH++ // quoting bar adds one line above the textarea
	}
	bodyH := m.height - headerH - inputH
	if bodyH < 1 {
		bodyH = 1
	}

	if m.branchOpen {
		mainW := m.width/2 - 1
		if mainW < 20 {
			mainW = 20
		}
		branchW := m.width - mainW - 1
		if branchW < 20 {
			branchW = 20
		}
		m.mainVP = viewport.New(mainW, bodyH)
		m.mainVP.SetContent(renderMessages(m.mainMsgs, mainW, -1, nil))
		m.branchVP = viewport.New(branchW, bodyH)
		m.branchVP.SetContent(renderMessages(m.branchMsgs, branchW, -1, nil))
	} else {
		w := m.width
		if w < 20 {
			w = 20
		}
		m.mainVP = viewport.New(w, bodyH)
		m.mainVP.SetContent(renderMessages(m.mainMsgs, w, -1, nil))
	}
	m.ta.SetWidth(m.width - 2)
}

// lastSelectableIdx returns the index of the last non-action message, or -1.
func lastSelectableIdx(msgs []renderMsg) int {
	for i := len(msgs) - 1; i >= 0; i-- {
		if msgs[i].kind != msgKindAction {
			return i
		}
	}
	return -1
}

func (m Model) activeLineSelect() *lineSelectInfo {
	if !m.lineSelect {
		return nil
	}
	return &lineSelectInfo{msgIdx: m.selectIdx, cursor: m.lineCursor, anchor: m.lineAnchor}
}

// refreshSelectView re-renders the active pane viewport with the current
// selection highlighted. Must be called on an addressable Model.
func (m *Model) refreshSelectView() {
	ls := m.activeLineSelect()
	if m.selectingBranch {
		m.branchVP.SetContent(renderMessages(m.branchMsgs, m.branchVP.Width, m.selectIdx, ls))
	} else {
		m.mainVP.SetContent(renderMessages(m.mainMsgs, m.mainVP.Width, m.selectIdx, ls))
	}
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
		branchLabel := "── branch"
		if len(m.branchMsgs) == 0 {
			branchLabel += hintStyle.Render("  seeded from main")
		}
		branchH := branchHeaderStyle.Render(branchLabel)
		gap := m.width/2 - lipgloss.Width(mainH) - 1
		if gap < 1 {
			gap = 1
		}
		header = mainH + strings.Repeat(" ", gap) + branchH
	} else {
		header = headerStyle.Render("── Tangent")
	}

	if m.selecting {
		modeStr := "SELECT"
		if m.lineSelect {
			modeStr = "LINE SELECT"
		}
		header += selectedStyle.Render("  ·  " + modeStr)
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

	var hint string
	switch {
	case m.err != "":
		hint = m.err
	case m.lineSelect:
		msgs := m.mainMsgs
		if m.selectingBranch {
			msgs = m.branchMsgs
		}
		totalLines := 0
		if m.selectIdx >= 0 && m.selectIdx < len(msgs) {
			totalLines = len(strings.Split(strings.TrimRight(msgs[m.selectIdx].content, "\n"), "\n"))
		}
		linePos := fmt.Sprintf("line %d/%d", m.lineCursor+1, totalLines)
		if m.lineAnchor >= 0 {
			lo, hi := m.lineAnchor, m.lineCursor
			if lo > hi {
				lo, hi = hi, lo
			}
			linePos += fmt.Sprintf("  ·  %d lines selected", hi-lo+1)
		}
		hint = linePos + "   space · anchor   enter · branch   esc · back"
	case m.selecting:
		hint = "↑↓ · navigate   enter · select lines   escape · cancel"
	case m.confirming:
		hint = "  " + m.confirmMsg + "   y · confirm   n · deny   v · select & branch"
	case m.closingBranch:
		hint = "close branch and discard conversation?   y · yes   n · cancel"
	case m.loading:
		if m.toolMsg != "" {
			hint = "  " + m.toolMsg + "..."
		} else {
			hint = "  thinking..."
		}
	case m.branchOpen:
		hint = "enter · send   tab · switch pane   v · select   ctrl+w · close branch   ↑↓ · history   ctrl+c · quit"
	default:
		hint = "enter · send   /branch <question> · open branch   v · select   ↑↓ · history   ctrl+c · quit"
	}

	parts := []string{header, body}
	if m.branchContext != "" {
		preview := strings.ReplaceAll(m.branchContext, "\n", " ")
		if len(preview) > 72 {
			preview = preview[:69] + "..."
		}
		parts = append(parts, hintStyle.Render("  ╌ quoting: "+preview))
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

func renderMessages(msgs []renderMsg, width, selectedIdx int, ls *lineSelectInfo) string {
	if width < 20 {
		width = 20
	}
	selectMode := selectedIdx >= 0
	var b strings.Builder
	for i, msg := range msgs {
		sel := i == selectedIdx
		dim := selectMode && !sel
		// When in line-select mode for this message, render line-by-line
		if ls != nil && i == ls.msgIdx {
			b.WriteString(renderLineSelect(msg, width, ls))
			continue
		}
		selStyle := selectedStyle.UnsetBackground()
		switch msg.kind {
		case msgKindUser:
			b.WriteString("\n")
			switch {
			case sel:
				b.WriteString(wrapText(msg.content, selStyle, "    ▶ ", "      ", width-6))
			case dim:
				b.WriteString(wrapText(msg.content, hintStyle, "  ▸ ", "    ", width-4))
			default:
				b.WriteString(wrapText(msg.content, userMsgStyle, "  ▸ ", "    ", width-4))
			}
			b.WriteString("\n")
		case msgKindAction:
			b.WriteString(actionMsgStyle.Render("  · "+msg.content) + "\n")
		case msgKindChat:
			switch {
			case sel:
				b.WriteString(wrapText(msg.content, selStyle, "    ", "    ", width-4))
				b.WriteString("\n")
			case dim:
				b.WriteString(wrapText(msg.content, hintStyle, "  ", "  ", width-2))
				b.WriteString("\n")
			default:
				b.WriteString(wrapText(msg.content, chatMsgStyle, "  ", "  ", width-2))
				b.WriteString("\n")
			}
		case msgKindCode:
			style := codeMsgStyle
			var prefix string
			var inner int
			switch {
			case sel:
				style = style.BorderForeground(colorSelect).Foreground(colorSelect)
				prefix = "    "
				inner = width - 8
			case dim:
				style = style.BorderForeground(colorDim).Foreground(colorDim)
				prefix = "  "
				inner = width - 6
			default:
				prefix = "  "
				inner = width - 6
			}
			if inner < 10 {
				inner = 10
			}
			b.WriteString(prefix + style.Width(inner).Render(msg.content) + "\n\n")
		case msgKindDiff:
			style := previewStyle
			var prefix string
			switch {
			case sel:
				style = style.BorderForeground(colorSelect)
				prefix = "  "
			case dim:
				style = style.BorderForeground(colorDim)
			}
			b.WriteString(prefix + style.Render(strings.TrimRight(renderDiff(msg.content), "\n")) + "\n\n")
		}
	}
	return b.String()
}

func renderLineSelect(msg renderMsg, width int, ls *lineSelectInfo) string {
	lines := strings.Split(strings.TrimRight(msg.content, "\n"), "\n")
	lo, hi := ls.cursor, ls.cursor
	if ls.anchor >= 0 {
		lo, hi = ls.anchor, ls.cursor
		if lo > hi {
			lo, hi = hi, lo
		}
	}

	var inner strings.Builder
	for i, line := range lines {
		inRange := i >= lo && i <= hi
		isCursor := i == ls.cursor
		switch {
		case isCursor:
			inner.WriteString(selectedStyle.Render("▶ "+line) + "\n")
		case inRange:
			inner.WriteString(lineRangeStyle.Render("  "+line) + "\n")
		default:
			switch msg.kind {
			case msgKindCode:
				inner.WriteString(codeLineStyle.Render("  "+line) + "\n")
			case msgKindDiff:
				switch {
				case strings.HasPrefix(line, "+"):
					inner.WriteString(diffAddStyle.Render("  "+line) + "\n")
				case strings.HasPrefix(line, "-"):
					inner.WriteString(diffRemoveStyle.Render("  "+line) + "\n")
				case strings.HasPrefix(line, "@@"):
					inner.WriteString(diffHunkStyle.Render("  "+line) + "\n")
				default:
					inner.WriteString(diffDefaultStyle.Render("  "+line) + "\n")
				}
			default:
				inner.WriteString(chatMsgStyle.Render("  "+line) + "\n")
			}
		}
	}
	content := strings.TrimRight(inner.String(), "\n")

	var b strings.Builder
	switch msg.kind {
	case msgKindCode:
		innerW := width - 6
		if innerW < 10 {
			innerW = 10
		}
		b.WriteString("  " + codeMsgStyle.BorderForeground(colorSelect).Width(innerW).Render(content) + "\n\n")
	case msgKindDiff:
		b.WriteString(previewStyle.BorderForeground(colorSelect).Render(content) + "\n\n")
	default:
		b.WriteString("\n" + selectBarStyle.Render(content) + "\n\n")
	}
	return b.String()
}

func wrapText(content string, style lipgloss.Style, prefix, indent string, lineW int) string {
	if lineW < 10 {
		lineW = 10
	}
	var b strings.Builder
	for pi, para := range strings.Split(content, "\n\n") {
		if pi > 0 {
			b.WriteString("\n")
		}
		words := strings.Fields(para)
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
	}
	return b.String()
}

func parseAIResponse(text string) []renderMsg {
	var msgs []renderMsg
	parts := strings.Split(text, "```")
	for i, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		if i%2 == 1 {
			// Inside a code fence — strip the language identifier line
			if idx := strings.Index(part, "\n"); idx != -1 {
				part = strings.TrimSpace(part[idx+1:])
			}
			if part != "" {
				msgs = append(msgs, renderMsg{kind: msgKindCode, content: part})
			}
		} else {
			msgs = append(msgs, renderMsg{kind: msgKindChat, content: part})
		}
	}
	return msgs
}
