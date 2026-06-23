package tui

import (
	"fmt"
	"strings"

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
	colorLineBg   = lipgloss.Color("#005f00") // subtle background for line-select highlight (ANSI256 color 22)
)

// lineBgAnsi256 is the raw ANSI256 index for colorLineBg, used to inject the
// background into pre-highlighted strings via withLineBg.
const lineBgAnsi256 = 22

// ── Styles ────────────────────────────────────────────────────────────────────

var (
	headerStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#06610f")).
			Background(lipgloss.Color("#49a352")).
			Bold(true).
			Padding(0, 1)

	branchHeaderStyle = lipgloss.NewStyle().
				Foreground(lipgloss.Color("#06610f")).
				Background(lipgloss.Color("#49a352")).
				Bold(true).
				Padding(0, 1)

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

	// Mode badge styles — rendered as a colored tag at the left of the hint bar.
	normalModeBadge = lipgloss.NewStyle().
			Background(lipgloss.Color("#585858")).
			Foreground(lipgloss.Color("#ffffff")).
			Bold(true).
			Padding(0, 1)

	insertModeBadge = lipgloss.NewStyle().
			Background(lipgloss.Color("#49a352")).
			Foreground(lipgloss.Color("#000000")).
			Bold(true).
			Padding(0, 1)

	selectModeBadge = lipgloss.NewStyle().
			Background(lipgloss.Color("#d78700")).
			Foreground(lipgloss.Color("#000000")).
			Bold(true).
			Padding(0, 1)

	confirmModeBadge = lipgloss.NewStyle().
			Background(lipgloss.Color("#ff8787")).
			Foreground(lipgloss.Color("#000000")).
			Bold(true).
			Padding(0, 1)
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
	lang    string // file language for syntax-highlighted diff rendering
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
	msgKindQuote                 // selected context shown before a branch question
)

type inputMode int

const (
	modeNormal inputMode = iota // command mode: v/i/↑↓ active, textarea blurred
	modeInsert                  // typing mode: all keys go to the textarea
)

type renderMsg struct {
	kind    msgKind
	content string
	lang    string // language identifier for msgKindCode blocks
}

// ── Per-pane modal state ──────────────────────────────────────────────────────

type paneState struct {
	loading           bool
	confirming        bool
	confirmMsg        string
	confirmPreview    string
	confirmMsgCh      chan confirmRequestMsg
	confirmResponseCh chan bool
	toolCh            chan string
	toolMsg           string
}

// ── Model ─────────────────────────────────────────────────────────────────────

type Model struct {
	state appState
	width int
	height int
	err   string

	mainPane   paneState
	branchPane paneState

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

	input inputBar

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

	inputMode inputMode
}

func New() Model {
	keyInput := textinput.New()
	keyInput.Placeholder = "sk-ant-..."
	keyInput.EchoMode = textinput.EchoPassword
	keyInput.EchoCharacter = '•'

	m := Model{
		setupInput: keyInput,
		input:      newInputBar(),
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
		action := renderMsg{kind: msgKindAction, content: string(msg)}
		if m.branchPane.loading {
			m.branchPane.toolMsg = string(msg)
			m.branchMsgs = append(m.branchMsgs, action)
			m.branchVP.SetContent(renderMessages(m.branchMsgs, m.branchVP.Width, -1, nil))
			m.branchVP.GotoBottom()
			return m, waitForTool(m.branchPane.toolCh)
		}
		m.mainPane.toolMsg = string(msg)
		m.mainMsgs = append(m.mainMsgs, action)
		m.mainVP.SetContent(renderMessages(m.mainMsgs, m.mainVP.Width, -1, nil))
		m.mainVP.GotoBottom()
		return m, waitForTool(m.mainPane.toolCh)

	case confirmRequestMsg:
		m.mainPane.confirming = true
		m.mainPane.confirmMsg = msg.msg
		m.mainPane.confirmPreview = msg.preview
		if msg.preview != "" {
			diff := renderMsg{kind: msgKindDiff, content: msg.preview, lang: msg.lang}
			m.mainMsgs = append(m.mainMsgs, diff)
			m.mainVP.SetContent(renderMessages(m.mainMsgs, m.mainVP.Width, -1, nil))
			m.mainVP.GotoBottom()
		}
		return m, nil

	case sendDoneMsg:
		if msg.isBranch {
			m.branchPane.loading = false
			m.branchPane.toolMsg = ""
			m.branchPane.toolCh = nil
			if msg.err != nil {
				m.err = msg.err.Error()
			} else {
				m.err = ""
				aiMsgs := parseAIResponse(msg.aiMsg)
				m.branchHistory = msg.history
				m.branchMsgs = append(m.branchMsgs, aiMsgs...)
				m.branchVP.SetContent(renderMessages(m.branchMsgs, m.branchVP.Width, -1, nil))
				m.branchVP.GotoBottom()
			}
			// If main is still running, resume listening to its toolCh.
			if m.mainPane.loading {
				return m, waitForTool(m.mainPane.toolCh)
			}
			return m, nil
		}
		m.mainPane.loading = false
		m.mainPane.toolMsg = ""
		m.mainPane.toolCh = nil
		m.mainPane.confirming = false
		m.mainPane.confirmMsg = ""
		m.mainPane.confirmPreview = ""
		m.mainPane.confirmMsgCh = nil
		m.mainPane.confirmResponseCh = nil
		if msg.err != nil {
			m.err = msg.err.Error()
			return m, nil
		}
		m.err = ""
		aiMsgs := parseAIResponse(msg.aiMsg)
		m.mainHistory = msg.history
		m.mainMsgs = append(m.mainMsgs, aiMsgs...)
		m.mainVP.SetContent(renderMessages(m.mainMsgs, m.mainVP.Width, -1, nil))
		m.mainVP.GotoBottom()
		return m, nil

	case tea.KeyMsg:
		keyStr := msg.String()

		// ── Universal: active in all modes and states ─────────────────────────
		switch keyStr {
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
					m.branchContext = ""
					m.resizeViewports()
				}
			}
			return m, nil
		}

		// ── Select mode ───────────────────────────────────────────────────────
		if m.selecting {
			msgs := m.mainMsgs
			if m.selectingBranch {
				msgs = m.branchMsgs
			}

			// Line-select sub-mode
			if m.lineSelect && m.selectIdx >= 0 && m.selectIdx < len(msgs) {
				lines := strings.Split(strings.TrimRight(msgs[m.selectIdx].content, "\n"), "\n")
				switch keyStr {
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
					selectedText := strings.Join(lines[lo:hi+1], "\n")
					// Capture lang before clearing selectIdx (used for quote highlighting)
					quoteLang := msgs[m.selectIdx].lang
					m.branchContext = selectedText
					m.selecting = false
					m.lineSelect = false
					m.selectIdx = -1
					m.lineCursor = 0
					m.lineAnchor = -1
					m.inputMode = modeInsert
					(&m).refreshSelectView()
					if !m.branchOpen {
						m.branchOpen = true
						m.branchFocused = true
						m.branchHistory = append([]agent.Turn{}, m.mainHistory...)
						m.resizeViewports()
					} else {
						m.branchFocused = true
					}
					m.branchMsgs = append(m.branchMsgs, renderMsg{kind: msgKindQuote, content: selectedText, lang: quoteLang})
					m.branchVP.SetContent(renderMessages(m.branchMsgs, m.branchVP.Width, -1, nil))
					m.branchVP.GotoBottom()
					return m, m.input.Focus()
				case "esc":
					m.lineSelect = false
					m.lineCursor = 0
					m.lineAnchor = -1
					(&m).refreshSelectView()
				}
				return m, nil
			}

			// Message-select mode
			switch keyStr {
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
			case "esc", "v":
				m.selecting = false
				m.lineSelect = false
				m.selectIdx = -1
				m.lineCursor = 0
				m.lineAnchor = -1
				m.inputMode = modeNormal
				(&m).refreshSelectView()
			}
			return m, nil
		}

		if m.mainPane.confirming && !m.branchFocused {
			switch keyStr {
			case "y":
				m.mainPane.confirming = false
				m.mainPane.confirmResponseCh <- true
				return m, waitForConfirm(m.mainPane.confirmMsgCh)
			case "n":
				m.mainPane.confirming = false
				m.mainPane.confirmResponseCh <- false
				return m, waitForConfirm(m.mainPane.confirmMsgCh)
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
			switch keyStr {
			case "y":
				m.closingBranch = false
				m.branchOpen = false
				m.branchFocused = false
				m.branchHistory = nil
				m.branchMsgs = []renderMsg{}
				m.branchContext = ""
				m.resizeViewports()
			case "n", "esc":
				m.closingBranch = false
			}
			return m, nil
		}

		// Block input only when the focused pane is loading.
		if (m.mainPane.loading && !m.branchFocused) || (m.branchPane.loading && m.branchFocused) {
			return m, nil
		}

		// ── Normal mode ───────────────────────────────────────────────────────
		if m.inputMode == modeNormal {
			switch keyStr {
			case "i", "enter":
				m.inputMode = modeInsert
				return m, m.input.Focus()
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
			case "up":
				if m.branchOpen && m.branchFocused {
					m.branchVP, _ = m.branchVP.Update(msg)
				} else {
					m.mainVP, _ = m.mainVP.Update(msg)
				}
			case "down":
				if m.branchOpen && m.branchFocused {
					m.branchVP, _ = m.branchVP.Update(msg)
				} else {
					m.mainVP, _ = m.mainVP.Update(msg)
				}
			}
			return m, nil
		}

		// ── Insert mode ───────────────────────────────────────────────────────
		if keyStr == "esc" {
			m.inputMode = modeNormal
			m.input.Blur()
			return m, nil
		}

		submitted, handled, inputCmd := m.input.Update(msg)
		if handled && submitted == "" {
			return m, inputCmd
		}
		if handled {
			input := submitted

			isBranchMsg := strings.HasPrefix(input, "/branch ") || (m.branchOpen && m.branchFocused)

			if isBranchMsg {
				displayQ := input
				if strings.HasPrefix(input, "/branch ") {
					displayQ = strings.TrimPrefix(input, "/branch ")
				}
				agentQ := displayQ
				if m.branchContext != "" {
					agentQ = "Regarding:\n\n" + m.branchContext + "\n\n" + displayQ
					m.branchContext = ""
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
				m.branchPane.loading = true
				m.branchPane.toolCh = make(chan string, 10)
				branchHistory := m.branchHistory
				agentRunner := m.ag
				branchToolCh := m.branchPane.toolCh
				agentQuestion := agentQ
				return m, tea.Batch(
					waitForTool(branchToolCh),
					func() tea.Msg {
						aiText, newHistory, err := agentRunner.Run(branchHistory, agentQuestion, func(toolMsg string) { branchToolCh <- toolMsg }, nil)
						close(branchToolCh)
						return sendDoneMsg{userMsg: displayQ, aiMsg: aiText, history: newHistory, isBranch: true, err: err}
					},
				)
			}

			m.mainMsgs = append(m.mainMsgs, renderMsg{kind: msgKindUser, content: input})
			m.mainVP.SetContent(renderMessages(m.mainMsgs, m.mainVP.Width, -1, nil))
			m.mainVP.GotoBottom()
			m.mainPane.loading = true
			m.mainPane.toolCh = make(chan string, 10)
			m.mainPane.confirmMsgCh = make(chan confirmRequestMsg, 1)
			m.mainPane.confirmResponseCh = make(chan bool, 1)
			mainHistory := m.mainHistory
			agentRunner := m.ag
			mainToolCh := m.mainPane.toolCh
			mainConfirmMsgCh := m.mainPane.confirmMsgCh
			mainConfirmResponseCh := m.mainPane.confirmResponseCh
			confirmFn := agent.ConfirmFn(func(name, confirmMsg, preview string) bool {
				lang := ""
				if name == "write_file" {
					path := strings.TrimPrefix(confirmMsg, "writing ")
					if dotIdx := strings.LastIndex(path, "."); dotIdx >= 0 {
						lang = strings.ToLower(path[dotIdx+1:])
					}
				}
				mainConfirmMsgCh <- confirmRequestMsg{msg: confirmMsg, preview: preview, lang: lang}
				return <-mainConfirmResponseCh
			})
			return m, tea.Batch(
				waitForTool(mainToolCh),
				waitForConfirm(mainConfirmMsgCh),
				func() tea.Msg {
					aiText, newHistory, err := agentRunner.Run(mainHistory, input, func(toolMsg string) { mainToolCh <- toolMsg }, confirmFn)
					close(mainToolCh)
					close(mainConfirmMsgCh)
					return sendDoneMsg{userMsg: input, aiMsg: aiText, history: newHistory, isBranch: false, err: err}
				},
			)
		}
		// In insert mode, swallow arrow keys — don't let them scroll the viewport.
		if keyStr == "up" || keyStr == "down" {
			return m, inputCmd
		}
		// key not handled by inputBar — pass to focused viewport
		var cmds []tea.Cmd
		if inputCmd != nil {
			cmds = append(cmds, inputCmd)
		}
		var viewportCmd tea.Cmd
		if m.branchOpen && m.branchFocused {
			m.branchVP, viewportCmd = m.branchVP.Update(msg)
		} else {
			m.mainVP, viewportCmd = m.mainVP.Update(msg)
		}
		cmds = append(cmds, viewportCmd)
		return m, tea.Batch(cmds...)
	}

	// Non-key events (e.g. mouse wheel): route to the focused viewport only.
	var cmds []tea.Cmd
	var viewportCmd tea.Cmd
	if m.branchOpen && m.branchFocused {
		m.branchVP, viewportCmd = m.branchVP.Update(msg)
	} else {
		m.mainVP, viewportCmd = m.mainVP.Update(msg)
	}
	cmds = append(cmds, viewportCmd)
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
	m.input.SetWidth(m.width)
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
		var mainH, branchH string
		branchLabel := "── branch"
		if len(m.branchMsgs) == 0 {
			branchLabel += "  seeded from main"
		}
		if m.branchFocused {
			mainH = hintStyle.Render("── main")
			branchH = branchHeaderStyle.Render(branchLabel)
		} else {
			mainH = headerStyle.Render("── main")
			branchH = hintStyle.Render(branchLabel)
		}
		gap := m.width/2 - lipgloss.Width(mainH) - 1
		if gap < 1 {
			gap = 1
		}
		header = mainH + strings.Repeat(" ", gap) + branchH
	} else {
		header = lipgloss.NewStyle().Foreground(lipgloss.Color("#49a352")).Bold(true).Render("── Tangent")
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
		hint = errorStyle.Render(m.err)
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
		hint = selectModeBadge.Render("LINE SELECT") + hintStyle.Render("  "+linePos+"   space · anchor   enter · branch   esc · back")
	case m.selecting:
		hint = selectModeBadge.Render("SELECT") + hintStyle.Render("  ↑↓ · navigate   enter · select lines   esc · cancel")
	case m.mainPane.confirming && !m.branchFocused:
		hint = confirmModeBadge.Render("CONFIRM") + hintStyle.Render("  "+m.mainPane.confirmMsg+"   y · confirm   n · deny   v · select & branch")
	case m.closingBranch:
		hint = hintStyle.Render("close branch and discard conversation?   y · yes   n · cancel")
	case m.mainPane.loading && !m.branchFocused:
		if m.mainPane.toolMsg != "" {
			hint = hintStyle.Render("  " + m.mainPane.toolMsg + "...")
		} else {
			hint = hintStyle.Render("  thinking...")
		}
	case m.inputMode == modeNormal && m.branchOpen:
		hint = normalModeBadge.Render("NORMAL") + hintStyle.Render("  i · insert   v · select   tab · switch pane   ctrl+w · close branch   ctrl+c · quit")
	case m.inputMode == modeNormal:
		hint = normalModeBadge.Render("NORMAL") + hintStyle.Render("  i · insert   v · select   ↑↓ · scroll   ctrl+c · quit")
	case m.branchOpen:
		hint = insertModeBadge.Render("INSERT") + hintStyle.Render("  enter · send   esc · normal   tab · switch pane   ctrl+w · close branch")
	default:
		hint = insertModeBadge.Render("INSERT") + hintStyle.Render("  enter · send   esc · normal   /branch · open branch   ↑↓ · history")
	}

	parts := []string{header, body, m.input.View(), hint}
	return lipgloss.JoinVertical(lipgloss.Left, parts...)
}

// ── Render helpers ────────────────────────────────────────────────────────────

func renderDiff(diff, lang string) string {
	lines := strings.Split(diff, "\n")

	// For new-file diffs, every code line starts with "+ ".
	// Collect the full code, highlight it as one block, then re-split so
	// chroma has the full context it needs for accurate highlighting.
	isNewFile := len(lines) > 0 && strings.HasPrefix(lines[0], "new file:")
	var highlightedCodeLines []string
	if isNewFile && lang != "" {
		var codeLines []string
		for _, line := range lines[1:] {
			if strings.HasPrefix(line, "+ ") {
				codeLines = append(codeLines, line[2:])
			} else if line == "+" {
				codeLines = append(codeLines, "")
			}
		}
		highlighted := highlightCode(strings.Join(codeLines, "\n"), lang)
		highlightedCodeLines = strings.Split(highlighted, "\n")
	}

	var b strings.Builder
	codeLineIdx := 0
	for _, line := range lines {
		switch {
		case strings.HasPrefix(line, "new file:"):
			b.WriteString(hintStyle.Render(line) + "\n")
		case strings.HasPrefix(line, "+"):
			if isNewFile && codeLineIdx < len(highlightedCodeLines) {
				b.WriteString(diffAddStyle.Render("+") + " " + highlightedCodeLines[codeLineIdx] + "\n")
				codeLineIdx++
			} else {
				b.WriteString(diffAddStyle.Render(line) + "\n")
			}
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
			inner := width - 6
			switch {
			case sel:
				style = style.BorderForeground(colorSelect).MarginLeft(4)
				inner = width - 8
			case dim:
				style = style.BorderForeground(colorDim).MarginLeft(2)
			default:
				style = style.MarginLeft(2)
			}
			if inner < 10 {
				inner = 10
			}
			highlighted := highlightCode(msg.content, msg.lang)
			b.WriteString(style.Width(inner).Render(highlighted) + "\n\n")
		case msgKindDiff:
			style := previewStyle
			switch {
			case sel:
				style = style.BorderForeground(colorSelect).MarginLeft(2)
			case dim:
				style = style.BorderForeground(colorDim)
			}
			b.WriteString(style.Render(strings.TrimRight(renderDiff(msg.content, msg.lang), "\n")) + "\n\n")
		case msgKindQuote:
			label := hintStyle.Render("  context")
			var quoteBody string
			if msg.lang != "" {
				highlighted := highlightCode(msg.content, msg.lang)
				quoteBody = selectBarStyle.Render(codeMsgStyle.BorderForeground(colorSelect).Width(width - 8).Render(highlighted))
			} else {
				quoteBody = selectBarStyle.Render(wrapText(msg.content, chatMsgStyle, "", "", width-4))
			}
			b.WriteString(label + "\n" + quoteBody + "\n")
		}
	}
	return b.String()
}

func renderLineSelect(msg renderMsg, width int, ls *lineSelectInfo) string {
	// For code blocks, use syntax-highlighted lines so colors carry through
	// into the line-select view. Non-code content uses the raw lines.
	rawLines := strings.Split(strings.TrimRight(msg.content, "\n"), "\n")
	displayLines := rawLines
	if msg.kind == msgKindCode {
		highlighted := highlightCode(msg.content, msg.lang)
		displayLines = strings.Split(strings.TrimRight(highlighted, "\n"), "\n")
		// Pad to same length in case chroma produces different line count
		for len(displayLines) < len(rawLines) {
			displayLines = append(displayLines, "")
		}
	}

	lo, hi := ls.cursor, ls.cursor
	if ls.anchor >= 0 {
		lo, hi = ls.anchor, ls.cursor
		if lo > hi {
			lo, hi = hi, lo
		}
	}

	var inner strings.Builder
	for i := range rawLines {
		rawLine := rawLines[i]
		displayLine := displayLines[i]
		inRange := i >= lo && i <= hi
		isCursor := i == ls.cursor

		if msg.kind == msgKindDiff {
			// Split each diff line into its prefix sign and code content so we
			// can color the +/- marker separately from the syntax-highlighted code.
			var prefixChar string
			var prefixStyle lipgloss.Style
			var codeContent string
			switch {
			case strings.HasPrefix(rawLine, "+ "):
				prefixChar, prefixStyle, codeContent = "+", diffAddStyle, rawLine[2:]
			case rawLine == "+":
				prefixChar, prefixStyle, codeContent = "+", diffAddStyle, ""
			case strings.HasPrefix(rawLine, "- "):
				prefixChar, prefixStyle, codeContent = "-", diffRemoveStyle, rawLine[2:]
			case rawLine == "-":
				prefixChar, prefixStyle, codeContent = "-", diffRemoveStyle, ""
			case strings.HasPrefix(rawLine, "@@"):
				prefixChar, prefixStyle, codeContent = "", diffHunkStyle, rawLine
			default:
				prefixChar, prefixStyle, codeContent = " ", diffDefaultStyle, strings.TrimPrefix(rawLine, " ")
			}

			highlighted := codeContent
			if msg.lang != "" && codeContent != "" && prefixChar != "@@" {
				highlighted = highlightCode(codeContent, msg.lang)
			}

			styledPrefix := prefixStyle.Render(prefixChar)
			markerStyle := lipgloss.NewStyle().Foreground(colorSelect).Background(colorLineBg).Bold(true)
			rangeBarStyle := lipgloss.NewStyle().Foreground(colorSelect).Background(colorLineBg)
			switch {
			case isCursor:
				inner.WriteString(markerStyle.Render("▶") + " " + styledPrefix + " " + withLineBg(highlighted, lineBgAnsi256) + "\n")
			case inRange:
				inner.WriteString(rangeBarStyle.Render("│") + " " + styledPrefix + " " + withLineBg(highlighted, lineBgAnsi256) + "\n")
			default:
				inner.WriteString("  " + styledPrefix + " " + highlighted + "\n")
			}
			continue
		}

		markerStyle := lipgloss.NewStyle().Foreground(colorSelect).Background(colorLineBg).Bold(true)
		rangeBarStyle := lipgloss.NewStyle().Foreground(colorSelect).Background(colorLineBg)
		switch {
		case isCursor:
			if msg.kind == msgKindCode {
				inner.WriteString(markerStyle.Render("▶ ") + withLineBg(displayLine, lineBgAnsi256) + "\n")
			} else {
				inner.WriteString(selectedStyle.Render("▶ "+displayLine) + "\n")
			}
		case inRange:
			if msg.kind == msgKindCode {
				inner.WriteString(rangeBarStyle.Render("│ ") + withLineBg(displayLine, lineBgAnsi256) + "\n")
			} else {
				inner.WriteString(lineRangeStyle.Render("  "+displayLine) + "\n")
			}
		default:
			switch msg.kind {
			case msgKindCode:
				inner.WriteString("  " + displayLine + "\n")
			default:
				inner.WriteString(chatMsgStyle.Render("  "+displayLine) + "\n")
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
			// Inside a code fence — extract and preserve the language identifier
			lang := ""
			if idx := strings.Index(part, "\n"); idx != -1 {
				lang = strings.TrimSpace(part[:idx])
				part = strings.TrimSpace(part[idx+1:])
			}
			if part != "" {
				msgs = append(msgs, renderMsg{kind: msgKindCode, content: part, lang: lang})
			}
		} else {
			msgs = append(msgs, renderMsg{kind: msgKindChat, content: part})
		}
	}
	return msgs
}
