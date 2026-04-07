import { useEffect, useState } from "react";
import { api } from "../api/client";
import ConversationSidebar from "../components/ChatComponents/ConversationSidebar";
import ChatWindow from "../components/ChatComponents/ChatWindow";

const styles = {
  page: {
    display: "flex",
    height: "100vh",
    width: "100vw",
    background: "#3e4d44",
    color: "#f5f5d3"
  },
};

function buildMessagesById(messages) {
  const map = new Map();
  for (const msg of messages) {
    map.set(msg.id, msg);
  }
  return map;
}

function getPathToRoot(messages, leafId) {
  if (!leafId) return [];

  const messagesById = buildMessagesById(messages);
  const path = [];

  let cursor = messagesById.get(leafId);

  while (cursor) {
    path.push(cursor);
    cursor = cursor.parent_msg_id
      ? messagesById.get(cursor.parent_msg_id)
      : null;
  }

  return path.reverse();
}

function getBranchPath(messages, leafId, branchPointId) {
  const fullPath = getPathToRoot(messages, leafId);
  const startIndex = fullPath.findIndex((m) => m.id === branchPointId);
  if (startIndex === -1) return [];
  return fullPath.slice(startIndex);
}

export default function ChatPage() {
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [mainLeafId, setMainLeafId] = useState(null);
  const [branchPanel, setBranchPanel] = useState(null);
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
      // pick default node (for now just last message)
      if (data.length > 0) {
          setMainLeafId(data[data.length - 1].id);
      }
      else {
          setMainLeafId(null);
     } 
     setBranchPanel(null)
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
      setMainLeafId(null);
      setBranchPanel(null);
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

      const data = await api(`/conversations/${selectedConversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: trimmed, parent_msg_id: mainLeafId}),
      });

      setMessages((prev) => [...prev, data.user_message, data.ai_message]);
      setMainLeafId(data.ai_message.id); 
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

  async function handleSendBranchMessage(e) {
    e.preventDefault();

    if (!branchPanel || !selectedConversationId || sending) {
        return;
    }

    const trimmed = branchPanel.input.trim();
    if (!trimmed) {
        return;
    }

    setSending(true);
    setError("");

    try {
      const data = await api(`/conversations/${selectedConversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({
        content: trimmed,
        parent_msg_id: branchPanel.leafId,
        branch_from_message_id: branchPanel.branchPointId,
        branch_from_text: branchPanel.branchFromText,
        }),
      });

      setMessages((prev) => [...prev, data.user_message, data.ai_message]);

      setBranchPanel((prev) => ({
        ...prev,
        leafId: data.ai_message.id,
        input: "",
      }));
    } 
    catch (err) {
      setError(err.message || "Failed to send branch message");
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

    return {
      ...convo,
      title: newTitle,
    };
  }

  function normalizeSelectedText(selectedText) {
      const cleaned = selectedText?.trim();
      return cleaned ? cleaned : null;
  }
  function handleOpenBranch(message, selectedText = null) {
    const cleanedText = normalizeSelectedText(selectedText);
    console.log("OPENED BRANCH: ", {
        messageId: message.id,
        selectedText,
        cleanedText
    });
    setBranchPanel({
      branchPointId: message.id,
      leafId: message.id,
      input: "",
      branchFromText: cleanedText,
    });
    console.log("branchPanel state:", branchPanel);
  }

  const mainPath = getPathToRoot(messages, mainLeafId);

  const branchPath = branchPanel ? getBranchPath(messages, branchPanel.leafId, branchPanel.branchPointId) : [];
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
        position={branchPanel ? "left" : "single"}
        error={error}
        selectedConversationId={selectedConversationId}
        loadingMessages={loadingMessages}
        messages={mainPath}
        input={input}
        setInput={setInput}
        onSendMessage={handleSendMessage}
        sending={sending}
        onSelectMessage={setMainLeafId}
        onOpenBranch={handleOpenBranch}
      />

      {branchPanel && (
      <ChatWindow
        position={"right"}
        error={error}
        selectedConversationId={selectedConversationId}
        loadingMessages={false}
        messages={branchPath}
        input={branchPanel.input}
        setInput={(val) =>
          setBranchPanel((prev) => ({ ...prev, input: val }))
        }
        onSendMessage={handleSendBranchMessage}
        sending={sending}
        onSelectMessage={(id) =>
          setBranchPanel((prev) => ({ ...prev, leafId: id }))
        }
      />
    )}
    </div>
  );
}
