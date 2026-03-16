import { useEffect, useState } from "react";
import { api } from "../api/client";
import ConversationSidebar from "../components/ChatComponents/ConversationSidebar";
import ChatWindow from "../components/ChatComponents/ChatWindow";

const styles = {
  page: {
    display: "flex",
    height: "100vh",
    background: "#2f2220",
    color: "#f5f5d3"
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
  }, []);

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
    } catch (err) {
      setError(err.message || "Failed to load conversations");
    } finally {
      setLoadingConversations(false);
    }
  }

  async function loadMessages(conversationId) {
    setLoadingMessages(true);
    setError("");

    try {
      const data = await api(`/conversations/${conversationId}/messages`);
      setMessages(data);
    } catch (err) {
      setError(err.message || "Failed to load messages");
    } finally {
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
    } catch (err) {
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
        let parentMsgId = null
        if (messages.length > 0) {
            parentMsgId = messages[messages.length - 1].id;
        }

      const data = await api(`/conversations/${selectedConversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: trimmed, parent_msg_id: parentMsgId }),
      });

      setMessages((prev) => [...prev, data.user_message, data.ai_message]);
      setInput("");

      setConversations((prev) => {
        return prev.map((convo) => {
          return updateConversationTitle(convo, selectedConversationId, trimmed);
        });
      });
    } catch (err) {
      setError(err.message || "Failed to send message");
    } finally {
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

    return {
      ...convo,
      title: newTitle,
    };
  }

  return (
    <div style={styles.page}>
      <ConversationSidebar
        conversations={conversations}
        selectedConversationId={selectedConversationId}
        loadingConversations={loadingConversations}
        onNewChat={handleNewChat}
        onSelectConversation={setSelectedConversationId}
      />

      <ChatWindow
        error={error}
        selectedConversationId={selectedConversationId}
        loadingMessages={loadingMessages}
        messages={messages}
        input={input}
        setInput={setInput}
        onSendMessage={handleSendMessage}
        sending={sending}
      />
    </div>
  );
}
