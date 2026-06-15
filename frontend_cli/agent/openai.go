package agent

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

const openaiAPI = "https://api.openai.com/v1/chat/completions"

type OpenAIProvider struct {
	apiKey string
	model  string
}

func NewOpenAIProvider(apiKey, model string) *OpenAIProvider {
	return &OpenAIProvider{apiKey: apiKey, model: model}
}

// ── Wire types ────────────────────────────────────────────────────────────────

type openaiRequest struct {
	Model    string          `json:"model"`
	Messages []openaiMessage `json:"messages"`
	Tools    []openaiTool    `json:"tools,omitempty"`
}

type openaiMessage struct {
	Role       string           `json:"role"`
	Content    interface{}      `json:"content"` // string or nil for tool calls
	ToolCalls  []openaiToolCall `json:"tool_calls,omitempty"`
	ToolCallID string           `json:"tool_call_id,omitempty"`
	Name       string           `json:"name,omitempty"`
}

type openaiToolCall struct {
	ID       string         `json:"id"`
	Type     string         `json:"type"`
	Function openaiFunction `json:"function"`
}

type openaiFunction struct {
	Name      string `json:"name"`
	Arguments string `json:"arguments"`
}

type openaiTool struct {
	Type     string          `json:"type"`
	Function openaiToolDescr `json:"function"`
}

type openaiToolDescr struct {
	Name        string      `json:"name"`
	Description string      `json:"description"`
	Parameters  interface{} `json:"parameters"`
}

type openaiResponse struct {
	Choices []struct {
		Message openaiMessage `json:"message"`
	} `json:"choices"`
}

// ── Conversion ────────────────────────────────────────────────────────────────

func (provider *OpenAIProvider) Complete(system string, history []Turn, tools []ToolDef) (string, []ToolCall, error) {
	msgs := []openaiMessage{{Role: "system", Content: system}}
	for _, turn := range history {
		expanded := turnToOpenAI(turn)
		msgs = append(msgs, expanded...)
	}

	apiTools := make([]openaiTool, len(tools))
	for i, tool := range tools {
		apiTools[i] = openaiTool{
			Type: "function",
			Function: openaiToolDescr{
				Name:        tool.Name,
				Description: tool.Description,
				Parameters:  tool.InputSchema,
			},
		}
	}

	req := openaiRequest{
		Model:    provider.model,
		Messages: msgs,
		Tools:    apiTools,
	}

	body, err := json.Marshal(req)
	if err != nil {
		return "", nil, err
	}

	httpReq, err := http.NewRequest("POST", openaiAPI, bytes.NewReader(body))
	if err != nil {
		return "", nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+provider.apiKey)

	resp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		return "", nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		var errBody map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&errBody)
		return "", nil, fmt.Errorf("openai HTTP %s: %v", resp.Status, errBody)
	}

	var result openaiResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", nil, err
	}
	if len(result.Choices) == 0 {
		return "", nil, fmt.Errorf("openai: empty response")
	}

	msg := result.Choices[0].Message
	text := ""
	if s, ok := msg.Content.(string); ok {
		text = s
	}

	var calls []ToolCall
	for _, toolCall := range msg.ToolCalls {
		input := map[string]string{}
		var generic map[string]interface{}
		if json.Unmarshal([]byte(toolCall.Function.Arguments), &generic) == nil {
			for k, v := range generic {
				input[k] = fmt.Sprintf("%v", v)
			}
		}
		calls = append(calls, ToolCall{ID: toolCall.ID, Name: toolCall.Function.Name, Input: input})
	}
	return text, calls, nil
}

// turnToOpenAI may expand one Turn into multiple messages (tool results require
// one message per result in OpenAI's format).
func turnToOpenAI(turn Turn) []openaiMessage {
	if len(turn.Results) > 0 {
		msgs := make([]openaiMessage, len(turn.Results))
		for i, result := range turn.Results {
			msgs[i] = openaiMessage{
				Role:       "tool",
				Content:    result.Content,
				ToolCallID: result.CallID,
			}
		}
		return msgs
	}

	if len(turn.Calls) > 0 {
		toolCalls := make([]openaiToolCall, len(turn.Calls))
		for i, call := range turn.Calls {
			args, _ := json.Marshal(call.Input)
			toolCalls[i] = openaiToolCall{
				ID:   call.ID,
				Type: "function",
				Function: openaiFunction{
					Name:      call.Name,
					Arguments: string(args),
				},
			}
		}
		content := interface{}(nil)
		if turn.Text != "" {
			content = turn.Text
		}
		return []openaiMessage{{Role: "assistant", Content: content, ToolCalls: toolCalls}}
	}

	return []openaiMessage{{Role: turn.Role, Content: turn.Text}}
}
