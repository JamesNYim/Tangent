package agent

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// tool bundles a ToolDef (what the model sees) with its implementation.
type tool struct {
	Def     ToolDef
	Execute func(cwd string, input map[string]string) string
	RequiresConfirmation bool
}

// toolBox maps tool name → tool. Add new tools here.
var toolBox = map[string]tool{
	"read_file": {
		Def: ToolDef{
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
		Execute: func(cwd string, input map[string]string) string {
			p, err := safePath(cwd, input["path"])
			if err != nil {
				return fmt.Sprintf("error: %v", err)
			}
			data, err := os.ReadFile(p)
			if err != nil {
				return fmt.Sprintf("error: %v", err)
			}
			return string(data)
		},
	},

	"list_directory": {
		Def: ToolDef{
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
		Execute: func(cwd string, input map[string]string) string {
			p := input["path"]
			if p == "" {
				p = "."
			}
			safe, err := safePath(cwd, p)
			if err != nil {
				return fmt.Sprintf("error: %v", err)
			}
			entries, err := os.ReadDir(safe)
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
		},
	},

	"search_files": {
		Def: ToolDef{
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
		Execute: func(cwd string, input map[string]string) string {
			p := input["path"]
			if p == "" {
				p = "."
			}
			safe, err := safePath(cwd, p)
			if err != nil {
				return fmt.Sprintf("error: %v", err)
			}
			pattern := input["pattern"]
			if pattern == "" {
				return "error: pattern is required"
			}
			out, _ := exec.Command("grep", "-r", "-n", "--", pattern, safe).Output()
			if len(out) == 0 {
				return "(no matches)"
			}
			return string(out)
		},
	},

	"run_command": {
		RequiresConfirmation: true,
		Def: ToolDef{
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
		Execute: func(cwd string, input map[string]string) string {
			cmd := exec.Command("sh", "-c", input["command"])
			cmd.Dir = cwd
			out, err := cmd.CombinedOutput()
			if err != nil {
				return fmt.Sprintf("%s\nerror: %v", string(out), err)
			}
			return string(out)
		},
	},

	"write_file": {
		RequiresConfirmation: true,
		Def: ToolDef{
			Name:        "write_file",
			Description: "Write content to a file, creating it if it doesn't exist",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"path": map[string]interface{}{
						"type":        "string",
						"description": "Relative path to the file",
					},
					"content": map[string]interface{}{
						"type":        "string",
						"description": "Content to write to the file",
					},
				},
				"required": []string{"path", "content"},
			},
		},
		Execute: func(cwd string, input map[string]string) string {
			fullPath, err := safePath(cwd, input["path"])
			if err != nil {
				return fmt.Sprintf("error: %v", err)
			}
			if err := os.MkdirAll(filepath.Dir(fullPath), 0755); err != nil {
				return fmt.Sprintf("error creating directories: %v", err)
			}
			if err := os.WriteFile(fullPath, []byte(input["content"]), 0644); err != nil {
				return fmt.Sprintf("error writing file: %v", err)
			}
			return fmt.Sprintf("wrote %s", input["path"])
		},
	},
}

// fileTools is the list of ToolDefs sent to the model on every request.
var fileTools = func() []ToolDef {
	defs := make([]ToolDef, 0, len(toolBox))
	for _, tool := range toolBox {
		defs = append(defs, tool.Def)
	}
	return defs
}()

func (a *Agent) executeTool(name string, input map[string]string) string {
	if tool, ok := toolBox[name]; ok {
		return tool.Execute(a.cwd, input)
	}
	return fmt.Sprintf("unknown tool: %s", name)
}

// safePath joins cwd and input, then verifies the result stays within cwd.
// Returns an error if the path escapes via ../ or symlinks.
func safePath(cwd, input string) (string, error) {
	full := filepath.Clean(filepath.Join(cwd, input))
	if !strings.HasPrefix(full+string(filepath.Separator), cwd+string(filepath.Separator)) {
		return "", fmt.Errorf("path %q is outside the working directory", input)
	}
	return full, nil
}
