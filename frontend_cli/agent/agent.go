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

// ── Provider interface ────────────────────────────────────────────────────────

// Provider is implemented by each AI backend (Anthropic, OpenAI, etc.).
// Complete sends the history and returns the assistant's text response
// plus any tool calls it wants to make. The agent loop handles the rest.
type Provider interface {
	Complete(system string, history []Turn, tools []ToolDef) (text string, calls []ToolCall, err error)
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
	if m, ok := DefaultModels[provider]; ok {
		return m
	}
	return ""
}

// ── Agent ─────────────────────────────────────────────────────────────────────

type Agent struct {
	provider Provider
	cwd      string
}

func New(apiKey, providerName, model string) (*Agent, error) {
	p, err := NewProvider(providerName, apiKey, model)
	if err != nil {
		return nil, err
	}
	cwd, _ := os.Getwd()
	return &Agent{provider: p, cwd: cwd}, nil
}

// Run appends userMsg to history, runs the agentic loop until the provider
// stops making tool calls, and returns the final text plus updated history.
// onTool is called each time a tool is invoked so the UI can show feedback.
func (a *Agent) Run(history []Turn, userMsg string, onTool func(name string)) (string, []Turn, error) {
	history = append(history, Turn{Role: "user", Text: userMsg})

	for {
		text, calls, err := a.provider.Complete(a.systemPrompt(), history, fileTools)
		if err != nil {
			return "", history, err
		}

		history = append(history, Turn{Role: "assistant", Text: text, Calls: calls})

		if len(calls) == 0 {
			return text, history, nil
		}

		// Execute each tool call and collect results
		var results []ToolResult
		for _, call := range calls {
			if onTool != nil {
				onTool(call.Name)
			}
			results = append(results, ToolResult{
				CallID:  call.ID,
				Content: a.executeTool(call.Name, call.Input),
			})
		}
		history = append(history, Turn{Role: "user", Results: results})
	}
}

func (a *Agent) systemPrompt() string {
	return fmt.Sprintf(`You are Tangent, an AI coding assistant running in a project directory. You can read files, search code, and run commands to help answer questions about the codebase.

Working directory: %s

Use tools to explore the codebase when needed. Be concise and specific.`, a.cwd)
}

// ── Tool definitions ──────────────────────────────────────────────────────────

var fileTools = []ToolDef{
	{
		Name:        "read_file",
		Description: "Read the contents of a file",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"path": map[string]interface{}{
					"type":        "string",
					"description": "Relative path to the file",
				},
			},
			"required": []string{"path"},
		},
	},
	{
		Name:        "list_directory",
		Description: "List files and directories at a path",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"path": map[string]interface{}{
					"type":        "string",
					"description": "Relative path to list (default: .)",
				},
			},
		},
	},
	{
		Name:        "search_files",
		Description: "Search for a pattern across files using grep",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"pattern": map[string]interface{}{
					"type":        "string",
					"description": "Search pattern",
				},
				"path": map[string]interface{}{
					"type":        "string",
					"description": "Directory to search in (default: .)",
				},
			},
			"required": []string{"pattern"},
		},
	},
	{
		Name:        "run_command",
		Description: "Run a shell command in the project directory",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"command": map[string]interface{}{
					"type":        "string",
					"description": "Shell command to run",
				},
			},
			"required": []string{"command"},
		},
	},
}

// ── Tool execution ────────────────────────────────────────────────────────────

func (a *Agent) executeTool(name string, input map[string]string) string {
	switch name {
	case "read_file":
		data, err := os.ReadFile(filepath.Join(a.cwd, input["path"]))
		if err != nil {
			return fmt.Sprintf("error: %v", err)
		}
		return string(data)

	case "list_directory":
		p := input["path"]
		if p == "" {
			p = "."
		}
		entries, err := os.ReadDir(filepath.Join(a.cwd, p))
		if err != nil {
			return fmt.Sprintf("error: %v", err)
		}
		var lines []string
		for _, e := range entries {
			if e.IsDir() {
				lines = append(lines, e.Name()+"/")
			} else {
				lines = append(lines, e.Name())
			}
		}
		return strings.Join(lines, "\n")

	case "search_files":
		p := input["path"]
		if p == "" {
			p = "."
		}
		out, _ := exec.Command("grep", "-r", "-n", input["pattern"], filepath.Join(a.cwd, p)).Output()
		if len(out) == 0 {
			return "(no matches)"
		}
		return string(out)

	case "run_command":
		cmd := exec.Command("sh", "-c", input["command"])
		cmd.Dir = a.cwd
		out, err := cmd.CombinedOutput()
		if err != nil {
			return fmt.Sprintf("%s\nerror: %v", string(out), err)
		}
		return string(out)
	}

	return fmt.Sprintf("unknown tool: %s", name)
}
