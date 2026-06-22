package agent

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

const anthropicAPI = "https://api.anthropic.com/v1/messages"

type AnthropicProvider struct {
	apiKey string
	model  string
}

func NewAnthropicProvider(apiKey, model string) *AnthropicProvider {
	return &AnthropicProvider{apiKey: apiKey, model: model}
}

// ── Wire types ────────────────────────────────────────────────────────────────

type anthropicRequest struct {
	Model     string             `json:"model"`
	MaxTokens int                `json:"max_tokens"`
	System    string             `json:"system"`
	Messages  []anthropicMessage `json:"messages"`
	Tools     []anthropicTool    `json:"tools,omitempty"`
}

type anthropicMessage struct {
	Role    string      `json:"role"`
	Content interface{} `json:"content"` // string or []anthropicContent
}

type anthropicContent struct {
	Type      string          `json:"type"`
	Text      string          `json:"text,omitempty"`
	ID        string          `json:"id,omitempty"`
	Name      string          `json:"name,omitempty"`
	Input     interface{}     `json:"input,omitempty"`
	ToolUseID string          `json:"tool_use_id,omitempty"`
	Content   json.RawMessage `json:"content,omitempty"`
}

type anthropicTool struct {
	Name        string      `json:"name"`
	Description string      `json:"description"`
	InputSchema interface{} `json:"input_schema"`
}

type anthropicUsage struct {
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
}

type anthropicResponse struct {
	Content    []anthropicContent `json:"content"`
	StopReason string             `json:"stop_reason"`
	Usage      anthropicUsage     `json:"usage"`
}

// ── Conversion ────────────────────────────────────────────────────────────────

func (provider *AnthropicProvider) Complete(system string, history []Turn, tools []ToolDef) (string, []ToolCall, int, int, error) {
	msgs := make([]anthropicMessage, 0, len(history))
	for _, turn := range history {
		msgs = append(msgs, turnToAnthropic(turn))
	}

	apiTools := make([]anthropicTool, len(tools))
	for i, tool := range tools {
		apiTools[i] = anthropicTool{
			Name:        tool.Name,
			Description: tool.Description,
			InputSchema: tool.InputSchema,
		}
	}

	req := anthropicRequest{
		Model:     provider.model,
		MaxTokens: 4096,
		System:    system,
		Messages:  msgs,
		Tools:     apiTools,
	}

	body, err := json.Marshal(req)
	if err != nil {
		return "", nil, 0, 0, err
	}

	httpReq, err := http.NewRequest("POST", anthropicAPI, bytes.NewReader(body))
	if err != nil {
		return "", nil, 0, 0, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("x-api-key", provider.apiKey)
	httpReq.Header.Set("anthropic-version", "2023-06-01")

	resp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		return "", nil, 0, 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		var errBody map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&errBody)
		return "", nil, 0, 0, fmt.Errorf("anthropic HTTP %s: %v", resp.Status, errBody)
	}

	var result anthropicResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", nil, 0, 0, err
	}

	var text string
	var calls []ToolCall
	for _, content := range result.Content {
		switch content.Type {
		case "text":
			text += content.Text
		case "tool_use":
			input := map[string]string{}
			if content.Input != nil {
				raw, _ := json.Marshal(content.Input)
				var generic map[string]interface{}
				if json.Unmarshal(raw, &generic) == nil {
					for k, v := range generic {
						input[k] = fmt.Sprintf("%v", v)
					}
				}
			}
			calls = append(calls, ToolCall{ID: content.ID, Name: content.Name, Input: input})
		}
	}
	return text, calls, result.Usage.InputTokens, result.Usage.OutputTokens, nil
}

func turnToAnthropic(turn Turn) anthropicMessage {
	if len(turn.Results) > 0 {
		var contents []anthropicContent
		for _, result := range turn.Results {
			raw, _ := json.Marshal(result.Content)
			contents = append(contents, anthropicContent{
				Type:      "tool_result",
				ToolUseID: result.CallID,
				Content:   raw,
			})
		}
		return anthropicMessage{Role: "user", Content: contents}
	}

	if len(turn.Calls) > 0 {
		var contents []anthropicContent
		if turn.Text != "" {
			contents = append(contents, anthropicContent{Type: "text", Text: turn.Text})
		}
		for _, call := range turn.Calls {
			contents = append(contents, anthropicContent{
				Type:  "tool_use",
				ID:    call.ID,
				Name:  call.Name,
				Input: call.Input,
			})
		}
		return anthropicMessage{Role: "assistant", Content: contents}
	}

	return anthropicMessage{Role: turn.Role, Content: turn.Text}
}
