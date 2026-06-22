package agent

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// ── Neutral types ─────────────────────────────────────────────────────────────

// Turn is a single entry in conversation history.
// Role is "user" or "assistant".
// A user turn has either Text (normal message) or Results (tool results).
// An assistant turn has Text and optionally Calls (tool calls).
type Turn struct {
	Role    string
	Text    string
	Calls   []ToolCall
	Results []ToolResult
}

type ToolCall struct {
	ID    string
	Name  string
	Input map[string]string
}

type ToolResult struct {
	CallID  string
	Content string
}

type ToolDef struct {
	Name        string
	Description string
	InputSchema interface{}
}

type OnToolFn func(msg string)

type ConfirmFn func(name, msg, preview string) bool

// ── Provider interface ────────────────────────────────────────────────────────

// Provider is implemented by each AI backend (Anthropic, OpenAI, etc.).
// Complete sends the history and returns the assistant's text response,
// any tool calls it wants to make, and the token counts for the round-trip.
type Provider interface {
	Complete(system string, history []Turn, tools []ToolDef) (text string, calls []ToolCall, inputTokens int, outputTokens int, err error)
}

// NewProvider creates the right Provider from a provider name and API key.
func NewProvider(provider, apiKey, model string) (Provider, error) {
	switch provider {
	case "anthropic":
		return NewAnthropicProvider(apiKey, model), nil
	case "openai":
		return NewOpenAIProvider(apiKey, model), nil
	default:
		return nil, fmt.Errorf("unknown provider: %s", provider)
	}
}

var DefaultModels = map[string]string{
	"anthropic": "claude-opus-4-7",
	"openai":    "gpt-4o",
}

func DefaultModel(provider string) string {
	if model, ok := DefaultModels[provider]; ok {
		return model
	}
	return ""
}

// ── Agent ─────────────────────────────────────────────────────────────────────

type Agent struct {
	provider Provider
	cwd      string
}

func New(apiKey, providerName, model string) (*Agent, error) {
	aiProvider, err := NewProvider(providerName, apiKey, model)
	if err != nil {
		return nil, err
	}
	cwd, err := os.Getwd()
	if err != nil {
		return nil, fmt.Errorf("could not determine working directory: %w", err)
	}
	return &Agent{provider: aiProvider, cwd: cwd}, nil
}

// Run appends userMsg to history, runs the agentic loop until the provider
// stops making tool calls, and returns the final text plus updated history.
// onTool is called each time a tool is invoked so the UI can show feedback.
func (a *Agent) Run(history []Turn, userMsg string, onTool OnToolFn, confirm ConfirmFn) (string, []Turn, error) {
	history = append(history, Turn{Role: "user", Text: userMsg})

	for {
		text, calls, inputTokens, outputTokens, err := a.provider.Complete(a.systemPrompt(), history, fileTools)
		if err != nil {
			return "", history, err
		}

		history = append(history, Turn{Role: "assistant", Text: text, Calls: calls})

		if onTool != nil && inputTokens > 0 {
			onTool(fmt.Sprintf("%d in · %d out", inputTokens, outputTokens))
		}

		if len(calls) == 0 {
			return text, history, nil
		}

		var results []ToolResult
		for _, call := range calls {

			// Confirming Tool
			tool, toolExists := toolBox[call.Name]
			if toolExists && tool.RequiresConfirmation {
				preview := generateDiff(a.cwd, call.Name, call.Input)
				if confirm == nil || !confirm(call.Name, formatToolMsg(call.Name, call.Input), preview) {
					results = append(results, ToolResult{
						CallID:  call.ID,
						Content: "user declined to execute this tool",
					})
					continue
				}
			}

			// Notify UI only after confirmation
			if onTool != nil {
				onTool(formatToolMsg(call.Name, call.Input))
			}

			results = append(results, ToolResult{
				CallID:  call.ID,
				Content: a.executeTool(call.Name, call.Input),
			})
		}
		history = append(history, Turn{Role: "user", Results: results})
	}
}

func generateDiff(cwd, name string, input map[string]string) string {
	if name != "write_file" {
		return ""
	}

	newContent := input["content"]
	fullPath := filepath.Join(cwd, input["path"])

	// new file — show all lines as additions
	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		var b strings.Builder
		b.WriteString("new file: " + input["path"] + "\n")
		for _, line := range strings.Split(newContent, "\n") {
			b.WriteString("+ " + line + "\n")
		}
		return b.String()
	}

	// existing file — write new content to temp file and diff
	tmp, err := os.CreateTemp("", "tangent-*")
	if err != nil {
		return ""
	}
	defer os.Remove(tmp.Name())
	tmp.WriteString(newContent)
	tmp.Close()

	if _, err := exec.LookPath("git"); err == nil {
		out, _ := exec.Command("git", "diff", "--no-index", "--color=never", fullPath, tmp.Name()).Output()
		if len(out) == 0 {
			return "(no changes)"
		}
		lines := strings.Split(string(out), "\n")
		if len(lines) > 4 {
			return strings.Join(lines[4:], "\n")
		}
		return string(out)
	}

	// fallback: use diff if git is not installed
	out, _ := exec.Command("diff", "-u", fullPath, tmp.Name()).Output()
	if len(out) == 0 {
		return "(no changes)"
	}
	return string(out)
}

func formatToolMsg(name string, input map[string]string) string {
	switch name {
	case "read_file":
		return "reading " + input["path"]
	case "list_directory":
		p := input["path"]
		if p == "" || p == "." {
			p = "./"
		}
		return "listing " + p
	case "search_files":
		pattern := input["pattern"]
		p := input["path"]
		if p == "" || p == "." {
			return `searching for "` + pattern + `"`
		}
		return `searching ` + p + ` for "` + pattern + `"`
	case "run_command":
		return "$ " + input["command"]
	case "write_file":
		return "writing " + input["path"]
	default:
		return "calling " + name
	}
}

func (a *Agent) systemPrompt() string {
	return fmt.Sprintf(`You are Tangent, an AI coding assistant running in a project directory. You have tools to read files, write files, list directories, search code, and run shell commands.

Working directory: %s

Rules:
- Always use tools to perform actions. Never describe what you would do — just do it.
- When asked to create or modify a file, call write_file immediately. Do not ask for permission first — the user will be prompted to confirm before anything is written.
- Never output file contents into the conversation. Write them to disk with write_file.
- Be concise. Act, then briefly summarize what you did.`, a.cwd)
}
