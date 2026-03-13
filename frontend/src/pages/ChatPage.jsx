import {useEffect, useState} from "react";
import { api } from "../api/client";

const styles = {
  page: {
    display: "flex",
    height: "100vh",
  },
  sidebar: {
    width: "260px",
    borderRight: "1px solid #ddd",
    padding: "16px",
    boxSizing: "border-box",
    overflowY: "auto",
  },
  sidebarHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  conversationList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  conversationItem: {
    textAlign: "left",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    background: "#fff",
    cursor: "pointer",
  },
  activeConversationItem: {
    background: "#f0f0f0",
    fontWeight: "bold",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  messagesArea: {
    flex: 1,
    padding: "16px",
    overflowY: "auto",
  },
  messageList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  messageBubble: {
    maxWidth: "70%",
    padding: "12px",
    borderRadius: "10px",
  },
  userBubble: {
    alignSelf: "flex-end",
    background: "#dbeafe",
  },
  assistantBubble: {
    alignSelf: "flex-start",
    background: "#f3f4f6",
  },
  messageRole: {
    fontSize: "12px",
    fontWeight: "bold",
    marginBottom: "4px",
    textTransform: "capitalize",
  },
  form: {
    display: "flex",
    gap: "8px",
    padding: "16px",
    borderTop: "1px solid #ddd",
  },
  input: {
    flex: 1,
    padding: "10px",
  },
  error: {
    color: "red",
  },
};

export default function ChatPage() {
    const [conversations, setConversations] = useState([]);
    const [selectedConversationId, setSelectedConversationId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loadingConversations, setLoadingConversations] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        loadConversations();
    }, [])

    useEffect(() => {
        if (selectedConversationId == null) return;
        loadMessages(selectedConversationId);
    }, [selectedConversationId]);

    async function loadConversations() {
        setLoadingConversations(true);
        setError("");

        try {
            const data = await api("/conversations");
            setConversations(data);

            if (data.length > 0) {
                setSelectedConversationId(data[0].id);
            }
        } 
        catch (e) {
            setError(err.message || "Failed to load conversations");
        } 
        finally {
            setLoadingConversations(false);
        }
    }

    async function loadMessages(conversationId) {
        setLoadingMessages(true);
        setError("");

        try {
          const data = await api(`/conversations/${conversationId}/messages`);
          setMessages(data);
        } 
        catch (err) {
            setError(err.message || "Failed to load messages");
        } 
        finally {
            setLoadingMessages(false);
        }
    }

    async function handleNewChat() {
        setError("");

        try {
            const newConversation = await api("/conversations", {
                method: "POST",
                body: JSON.stringify({ title: "" }),
            });

          setConversations((prev) => [newConversation, ...prev]);
          setSelectedConversationId(newConversation.id);
          setMessages([]);
        } 
        catch (err) {
            setError(err.message || "Failed to create conversation");
        }
    }

    async function handleSendMessage(e) {
        e.preventDefault();

        const trimmed = input.trim();
        if (!trimmed || !selectedConversationId || sending) return;

        setSending(true);
        setError("");

        try {
            const data = await api(`/conversations/${selectedConversationId}/messages`, {
                method: "POST",
                body: JSON.stringify({ content: trimmed }),
            });

            setMessages((prev) => [...prev, data.user_message, data.ai_message]);
            setInput("");

            setConversations((prev) => {
                return prev.map((convo) => {
                    return updateConversationTitle(convo, selectedConversationId, trimmed);
                });
            });
        } 
        catch (err) {
            setError(err.message || "Failed to send message");
        } 
        finally {
            setSending(false);
        }
    }

    function updateConversationTitle(convo, selectedConversationId, trimmed) {
        const isSelectedConversation = convo.id === selectedConversationId;

        if (!isSelectedConversation) {
            return convo;
        }

        const isDefaultTitle = convo.title === "New Chat";

        if (!isDefaultTitle) {
            return convo;
        }

        const newTitle = trimmed.slice(0, 40);

        return {...convo, title: newTitle,};
    }

    return (
        <div style={styles.page}>
          <aside style={styles.sidebar}>
            <div style={styles.sidebarHeader}>
              <h2 style={{ margin: 0 }}>Chats</h2>
              <button onClick={handleNewChat}>+ New</button>
            </div>

            {loadingConversations ? (
              <p>Loading conversations...</p>
            ) : conversations.length === 0 ? (
              <p>No conversations yet.</p>
            ) : (
              <div style={styles.conversationList}>
                {conversations.map((convo) => {
                  const isActive = convo.id === selectedConversationId;

                  return (
                    <button
                      key={convo.id}
                      onClick={() => setSelectedConversationId(convo.id)}
                      style={{
                        ...styles.conversationItem,
                        ...(isActive ? styles.activeConversationItem : {}),
                      }}
                    >
                      {convo.title || "Untitled Chat"}
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          <main style={styles.main}>
            <div style={styles.messagesArea}>
              {error && <p style={styles.error}>{error}</p>}

              {selectedConversationId == null ? (
                <p>Select or create a conversation.</p>
              ) : loadingMessages ? (
                <p>Loading messages...</p>
              ) : messages.length === 0 ? (
                <p>No messages yet. Start the conversation.</p>
              ) : (
                <div style={styles.messageList}>
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      style={{
                        ...styles.messageBubble,
                        ...(msg.role === "user"
                          ? styles.userBubble
                          : styles.assistantBubble),
                      }}
                    >
                      <div style={styles.messageRole}>{msg.role}</div>
                      <div>{msg.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={handleSendMessage} style={styles.form}>
              <input
                type="text"
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={!selectedConversationId || sending}
                style={styles.input}
              />
              <button type="submit" disabled={!selectedConversationId || sending}>
                {sending ? "Sending..." : "Send"}
              </button>
            </form>
          </main>
        </div>
      );
}
