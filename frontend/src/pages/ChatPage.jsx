import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import ConversationSidebar from "../components/ChatComponents/ConversationSidebar";
import ChatWindow from "../components/ChatComponents/ChatWindow";
import TreeSidebar from "../components/ChatComponents/TreeSidebar";
import { api }  from "../api/client"; 

import {
  createConversation,
  getConversations,
  getConversation,
  renameConversation,
  deleteConversation,
  getMessages,
  sendMessage,
} from "../api/chat";

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
  return fullPath.slice(startIndex + 1); // + 1 to not include original message
}

function buildChildrenMap(messages) {
    const map = new Map();

    for (const msg of messages) {
        const parentId = msg.parent_msg_id;
        if (!map.has(parentId)) {
            map.set(parentId, []);
        }
        let branchChildren = map.get(parentId);
        branchChildren.push(msg);
    }

    return map;
}

export default function ChatPage() {
  const messageRefs = useRef(new Map());
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [mainLeafId, setMainLeafId] = useState(null);
  const [branchPanel, setBranchPanel] = useState(null);
  const [input, setInput] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [focusedMessageId, setFocusedMessageId] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedConversationId == null) return;
    loadMessages(selectedConversationId);
  }, [selectedConversationId]);

  const registerMessageRef = useCallback((id, el) => {
    if (el) {
      messageRefs.current.set(id, el);
    } else {
      messageRefs.current.delete(id);
    }
  }, []);

  async function loadConversations() {
    setLoadingConversations(true);
    setError("");

    try {
      const conversations = await getConversations();
      setConversations(conversations);

      if (conversations.length > 0) {
        setSelectedConversationId(conversations[0].id);
      }
    } catch (err) {
      setError(err.message || "Failed to load conversations");
    } finally {
      setLoadingConversations(false);
    }
  }

  async function handleRenameConversation(conversationId, currentTitle) {
    const newTitle = window.prompt("Rename chat:", currentTitle);
  
    if (newTitle == null) {
      return;
    }
  
    const trimmed = newTitle.trim();
  
    if (!trimmed) {
      return;
    }
  
    try {
      const updatedConversation = await renameConversation(conversationId, trimmed);
  
      setConversations((prev) =>
        prev.map((convo) => {
          if (convo.id === conversationId) {
            return {
              ...convo,
              title: updatedConversation.title,
            };
          }
  
          return convo;
        })
      );
    } catch (err) {
      setError(err.message || "Failed to rename conversation");
    }
  }

  async function handleDeleteConversation(conversationId) {
    try {
        const deletedConversation = await deleteConversation(conversationId);

        setConversations((prev) =>
            prev.filter((convo) => convo.id !== conversationId));

        if (selectedConversationId === conversationId) {
            setSelectedConversationId(null);
            setMessages([]);
        }
    }
    catch (e) {
      console.log("Failed to delete conversation", e);
      setError(e.message || "Failed to delete conversation");
    }
  }

  async function loadMessages(conversationId) {
    setLoadingMessages(true);
    setError("");

    try {
      const messages = await getMessages(conversationId);
      const convo = await getConversation(conversationId);
      setMessages(messages);
      
      const resolvedMainLeafId = convo.main_leaf_id ?? (messages.length > 0 ? messages[messages.length - 1].id : null);
      setMainLeafId(resolvedMainLeafId);
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
      const newConversation = await createConversation();

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

      const message = await sendMessage(selectedConversationId, trimmed, mainLeafId);

      setMessages((prev) => [...prev, message.user_message, message.ai_message]);
      setMainLeafId(message.ai_message.id); 
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

    const combinedContent = branchPanel.branchFromText
      ? `Highlighted context: ${branchPanel.branchFromText}\n\nUser input: ${trimmed}`
      : trimmed;

    setSending(true);
    setError("");

    try {
      const data = await api(`/conversations/${selectedConversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({
        content: combinedContent,
        parent_msg_id: branchPanel.hasStarted ? branchPanel.branchLeafId : branchPanel.branchPointId,
        branch_from_message_id: branchPanel.branchPointId,
        branch_from_text: branchPanel.branchFromText,
        }),
      });

      setMessages((prev) => [...prev, data.user_message, data.ai_message]);

      setBranchPanel((prev) => ({
        ...prev,
        branchLeafId: data.ai_message.id,
        input: "",
        hasStarted: true,
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

  function findLatestBranchLeaf(branchPointId, childrenMap) {
    const children = childrenMap.get(branchPointId);
    if (!children || children.length === 0) {
      return null;
    }
  
    let current = children[0]; // active branch child
  
    while (childrenMap.get(current.id) && childrenMap.get(current.id).length > 0) {
      current = childrenMap.get(current.id)[0];
    }
  
    return current.id;
  }

  function handleOpenBranch(
    message,
    selectedText = null,
    childId = null,
    sourceLeafId = null,
    sourceBranchPointId = null
  ) {
    const cleanedText = normalizeSelectedText(selectedText);
  
    // Opening an existing branch
    if (childId) {
      const leafId = findLatestBranchLeaf(childId, childrenMap) ?? childId;
  
      setBranchPanel({
        trunkLeafId: sourceLeafId ?? mainLeafId ?? message.id,
        trunkBranchPointId: sourceBranchPointId,
        branchLeafId: leafId,
        branchPointId: message.id,
        input: "",
        branchFromText: null,
        hasStarted: true,
      });
  
      return;
    }
  
    // Starting a new branch from highlighted text / bubble
    setBranchPanel({
      trunkLeafId: sourceLeafId ?? mainLeafId ?? message.id,
      trunkBranchPointId: sourceBranchPointId,
      branchLeafId: message.id,
      branchPointId: message.id,
      input: "",
      branchFromText: cleanedText,
      hasStarted: false,
    });
  }

  function handleBranchToggle(messageId, childId = null, sourceLeafId = null, sourceBranchPointId = null) {
    if (!childId) return;
  
    const leafId = findLatestBranchLeaf(childId, childrenMap) ?? childId;
  
    const isSameBranchOpen =
      branchPanel &&
      branchPanel.branchPointId === messageId &&
      branchPanel.branchLeafId === leafId &&
      branchPanel.hasStarted;
  
    if (isSameBranchOpen) {
      setBranchPanel(null);
      return;
    }
  
    const message = messages.find((msg) => msg.id === messageId);
    if (!message) return;
  
    handleOpenBranch(message, null, childId, sourceLeafId, sourceBranchPointId);
  }

  const mainPath = getPathToRoot(messages, mainLeafId);
  const leftPath = branchPanel ? branchPanel.trunkBranchPointId
    ? getBranchPath(
        messages,
        branchPanel.trunkLeafId,
        branchPanel.trunkBranchPointId
    )
    : getPathToRoot(messages, branchPanel.trunkLeafId)
    : mainPath;
  const rightPath = branchPanel ? getBranchPath(messages, branchPanel.branchLeafId, branchPanel.branchPointId) : [];


  useEffect(() => {
    if (focusedMessageId == null && mainPath.length > 0) {
      setFocusedMessageId(mainPath[mainPath.length - 1].id);
    }
  }, [mainPath]);

  function handleJumpToMessage(messageId) {
    const el = messageRefs.current.get(messageId);
  
    if (!el) return;
  
    el.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  
    setFocusedMessageId(messageId);
  }
  const handleMainScroll = useCallback((e) => {
    console.log("scroll handler fired");
    //const container = messagesContainerRef.current;
    const container = e.currentTarget; 
    const containerRect = container.getBoundingClientRect();
    //const midpoint = containerRect.top + containerRect.height / 2;
    const scrollTop = container.scrollTop;
    const maxScrollTop = container.scrollHeight - container.clientHeight;
    const progress = maxScrollTop === 0 ? 0 : scrollTop / maxScrollTop;
    
    // moves from top → bottom as user scrolls
    const detectRatio = progress;
    
    const detectPoint = containerRect.top + containerRect.height * detectRatio;
    let closestId = null;
    let closestDistance = Infinity;
  
    for (const msg of mainPath) {
      const el = messageRefs.current.get(msg.id);
      if (!el) continue;
  
      const rect = el.getBoundingClientRect();
      let distance;

      if (detectPoint >= rect.top && detectPoint <= rect.bottom) {
        distance = 0;
      } 
      else {
        const distanceToTop = Math.abs(rect.top - detectPoint);
        const distanceToBottom = Math.abs(rect.bottom - detectPoint);

        distance = Math.min(distanceToTop, distanceToBottom);
      }

      if (distance < closestDistance) {
        closestDistance = distance;
        closestId = msg.id;
      }
    }
  
    if (closestId !== null) {
      console.log("Focused:", closestId);
      setFocusedMessageId(closestId);
    }
  }, [mainPath]);

  const childrenMap = buildChildrenMap(messages);
  return (
    <div style={styles.page}>
      <ConversationSidebar
        conversations={conversations}
        selectedConversationId={selectedConversationId}
        loadingConversations={loadingConversations}
        onNewChat={handleNewChat}
        onSelectConversation={setSelectedConversationId}
        onRenameConversation={handleRenameConversation}
        onDeleteConversation={handleDeleteConversation}
      />

  
      <TreeSidebar
          mainPath={mainPath}
          childrenMap={childrenMap}
          focusedMessageId={focusedMessageId}
          activeLastLeafId={mainLeafId}
          onJumpToMessage={handleJumpToMessage}
          onBranchToggle={handleBranchToggle}      
      />
      {!branchPanel ? (
        <ChatWindow
          position="single"
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
          childrenMap={childrenMap}
          openBranchId={null}
          registerMessageRef={registerMessageRef}
          onMainScroll={handleMainScroll}
          onBranchToggle={(messageId, childId) =>
            handleBranchToggle(messageId, childId, mainLeafId)
          }
        />
      ) : (
        <>
          <ChatWindow
            position="left"
            error={error}
            selectedConversationId={selectedConversationId}
            loadingMessages={loadingMessages}
            messages={leftPath}
            input={input}
            setInput={setInput}
            onSendMessage={handleSendMessage}
            sending={sending}
            onSelectMessage={(msg) => {
              setBranchPanel((prev) => ({
                ...prev,
                trunkLeafId: msg.id,
              }));
            }}
            onOpenBranch={(message, selectedText, childId) =>
              handleOpenBranch(
                message,
                selectedText,
                childId,
                branchPanel.trunkLeafId,
                branchPanel.trunkBranchPointId,
              )
            }
            childrenMap={childrenMap}
            openBranchId={branchPanel.branchPointId}
            registerMessageRef={registerMessageRef}
            onMainScroll={handleMainScroll}
            onBranchToggle={(messageId, childId) =>
              handleBranchToggle(messageId, childId, branchPanel.trunkLeafId, branchPanel.trunkBranchPointId)
            }
          />
      
          <ChatWindow
            position="right"
            error={error}
            selectedConversationId={selectedConversationId}
            loadingMessages={loadingMessages}
            messages={rightPath}
            input={branchPanel.input}
            setInput={(value) =>
              setBranchPanel((prev) => ({
                ...prev,
                input: value,
              }))
            }
            onSendMessage={handleSendBranchMessage}
            sending={sending}
            onSelectMessage={(msg) => {
              setBranchPanel((prev) => ({
                ...prev,
                branchLeafId: msg.id,
              }));
            }}
            onOpenBranch={(message, selectedText, childId) =>
              handleOpenBranch(
                message,
                selectedText,
                childId,
                branchPanel.branchLeafId,
                branchPanel.branchPointId
              )
            } 
            childrenMap={childrenMap}
            openBranchId={branchPanel.branchPointId}
            branchPointId={branchPanel.branchPointId}
            branchFromText={branchPanel.branchFromText}
            registerMessageRef={registerMessageRef}
            onMainScroll={handleMainScroll}
            onBranchToggle={(messageId, childId) =>
              handleBranchToggle(messageId, childId, branchPanel.branchLeafId, branchPanel.branchPointId)
            }
          />
        </>
      )}
    </div>
  );
}
