package client

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

const backend = "http://localhost:8000" // TODO: move to .env
const CLIENT_TIMEOUT_MIN = 60 * time.Minute

var httpClient = &http.Client{Timeout: CLIENT_TIMEOUT_MIN}

// ── Domain types (mirrors types.ts) ──────────────────────────────────────────

type Conversation struct {
	ID         int    `json:"id"`
	Title      string `json:"title"`
	MainLeafID *int   `json:"main_leaf_id"`
}

type Message struct {
	ID                  int    `json:"id"`
	Role                string `json:"role"`
	Content             string `json:"content"`
	ParentMsgID         *int   `json:"parent_msg_id"`
	BranchFromMessageID *int   `json:"branch_from_message_id"`
}

type SendMessageResponse struct {
	UserMessage Message `json:"user_message"`
	AIMessage   Message `json:"ai_message"`
}

// ── Client ────────────────────────────────────────────────────────────────────

type Client struct {
	Token string
}

func New(token string) *Client {
	return &Client{Token: token}
}

func (c *Client) request(method, path string, body any) (*http.Response, error) {
	var buf bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&buf).Encode(body); err != nil {
			return nil, err
		}
	}
	req, err := http.NewRequest(method, backend+path, &buf)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	if c.Token != "" {
		req.Header.Set("Authorization", "Bearer "+c.Token)
	}
	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode >= 400 {
		resp.Body.Close()
		return nil, fmt.Errorf("HTTP %s", resp.Status)
	}
	return resp, nil
}

// ── Request bodies ────────────────────────────────────────────────────────────

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type createConversationRequest struct {
	Title string `json:"title"`
}

type sendMessageRequest struct {
	Content             string `json:"content"`
	ParentMsgID         *int   `json:"parent_msg_id"`
	BranchFromMessageID *int   `json:"branch_from_message_id"`
}

// ── Auth ──────────────────────────────────────────────────────────────────────

func Login(username, password string) (string, error) {
	c := &Client{}
	resp, err := c.request("POST", "/auth/login", loginRequest{
		Username: username,
		Password: password,
	})
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	var result struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}
	if result.AccessToken == "" {
		return "", fmt.Errorf("no token in response")
	}
	return result.AccessToken, nil
}

// ── Conversations ─────────────────────────────────────────────────────────────

func (c *Client) GetConversations() ([]Conversation, error) {
	resp, err := c.request("GET", "/conversations", nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	var result []Conversation
	return result, json.NewDecoder(resp.Body).Decode(&result)
}

func (c *Client) CreateConversation(title string) (Conversation, error) {
	resp, err := c.request("POST", "/conversations", createConversationRequest{Title: title})
	if err != nil {
		return Conversation{}, err
	}
	defer resp.Body.Close()
	var result Conversation
	return result, json.NewDecoder(resp.Body).Decode(&result)
}

// ── Messages ──────────────────────────────────────────────────────────────────

func (c *Client) SendMessage(conversationID int, content string, parentMsgID *int, branchFromMessageID *int) (SendMessageResponse, error) {
	resp, err := c.request("POST", fmt.Sprintf("/conversations/%d/messages", conversationID), sendMessageRequest{
		Content:             content,
		ParentMsgID:         parentMsgID,
		BranchFromMessageID: branchFromMessageID,
	})
	if err != nil {
		return SendMessageResponse{}, err
	}
	defer resp.Body.Close()
	var result SendMessageResponse
	return result, json.NewDecoder(resp.Body).Decode(&result)
}
