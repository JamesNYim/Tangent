import React, { useRef, useState, useEffect, useCallback } from "react";
import ChatWindow from "../components/ChatComponents/ChatWindow";
import TreeSidebar from "../components/ChatComponents/TreeSidebar";
import Breadcrumb from "../components/ChatComponents/Breadcrumb";
import Sidebar from "../components/Sidebar";
import { api } from "../api/client";
import {
  createConversation,
  getConversations,
  getConversation,
  renameConversation,
  deleteConversation,
  getMessages,
  sendMessage,
} from "../api/chat";
import type { Message, Conversation, BranchPanel, SendMessageResponse } from "../types";

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: "flex",
    height: "100vh",
    width: "100%",
    background: "#3e4d44",
    color: "#f5f5d3",
  },
  chatArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  panes: {
    flex: 1,
    display: "flex",
    minHeight: 0,
    minWidth: 0,
    gap: 0,
    width: "100%",
  },
};

function buildMessagesById(messages: Message[]): Map<number, Message> {
  const map = new Map<number, Message>();
  for (const msg of messages) {
    map.set(msg.id, msg);
  }
  return map;
}

function getPathToRoot(messages: Message[], leafId: number | null): Message[] {
  if (!leafId) return [];
  const messagesById = buildMessagesById(messages);
  const path: Message[] = [];
  let cursor: Message | undefined = messagesById.get(leafId);
  while (cursor) {
    path.push(cursor);
    cursor = cursor.parent_msg_id ? messagesById.get(cursor.parent_msg_id) : undefined;
  }
  return path.reverse();
}

function getBranchPath(messages: Message[], leafId: number, branchPointId: number): Message[] {
  const fullPath = getPathToRoot(messages, leafId);
  const startIndex = fullPath.findIndex((m) => m.id === branchPointId);
  if (startIndex === -1) return [];
  return fullPath.slice(startIndex + 1);
}

function buildChildrenMap(messages: Message[]): Map<number | null, Message[]> {
  const map = new Map<number | null, Message[]>();
  for (const msg of messages) {
    const parentId = msg.parent_msg_id;
    if (!map.has(parentId)) map.set(parentId, []);
    map.get(parentId)!.push(msg);
  }
  return map;
}

export default function ChatPage() {
  const messageRefs = useRef(new Map<number, HTMLDivElement>());
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [mainLeafId, setMainLeafId] = useState<number | null>(null);
  const [branchPanel, setBranchPanel] = useState<BranchPanel | null>(null);
  const [input, setInput] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [leftFocusedMessageId, setLeftFocusedMessageId] = useState<number | null>(null);
  const [rightFocusedMessageId, setRightFocusedMessageId] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedConversationId == null) return;
    loadMessages(selectedConversationId);
  }, [selectedConversationId]);

  const registerMessageRef = useCallback((id: number, el: HTMLDivElement | null) => {
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
      setError(err instanceof Error ? err.message : "Failed to load conversations");
    } finally {
      setLoadingConversations(false);
    }
  }

  async function handleRenameConversation(conversationId: number, currentTitle: string) {
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
      setError(err instanceof Error ? err.message : "Failed to rename conversation");
    }
  }

  async function handleDeleteConversation(conversationId: number) {
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
      setError(e instanceof Error ? e.message : "Failed to delete conversation");
    }
  }

  async function loadMessages(conversationId: number) {
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
      setError(err instanceof Error ? err.message : "Failed to load messages");
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
      setError(err instanceof Error ? err.message : "Failed to create conversation");
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
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
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  async function handleSendBranchMessage(e: React.FormEvent) {
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
      }) as SendMessageResponse;

      setMessages((prev) => [...prev, data.user_message, data.ai_message]);

      setBranchPanel((prev) => prev ? ({
        ...prev,
        branchLeafId: data.ai_message.id,
        input: "",
        hasStarted: true,
      }) : null);
    } 
    catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send branch message");
    } 
    finally {
      setSending(false);
    }
  }  

  function updateConversationTitle(convo: Conversation, selectedConversationId: number, trimmed: string): Conversation {
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

  function normalizeSelectedText(selectedText: string | null | undefined): string | null {
    const cleaned = selectedText?.trim();
    return cleaned ? cleaned : null;
  }

  function findLatestBranchLeaf(startId: number, childrenMap: Map<number | null, Message[]>): number {
    let currentId = startId;
    while (true) {
      const children = childrenMap.get(currentId) || [];
      const continuationChild = children.find((child) => child.branch_from_message_id !== currentId);
      if (!continuationChild) return currentId;
      currentId = continuationChild.id;
    }
  }

  function handleOpenBranch(
    message: Message,
    selectedText: string | null = null,
    childId: number | null = null,
    sourceLeafId: number | null = null,
    sourceBranchPointId: number | null = null
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

  function handleBranchToggle(messageId: number, childId: number | null = null, sourceLeafId: number | null = null, sourceBranchPointId: number | null = null) {
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

    if (sourceLeafId) {
      setLeftFocusedMessageId(sourceLeafId);
    } 
    else {
      setLeftFocusedMessageId(messageId);
    }
    setRightFocusedMessageId(leafId);
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
    if (leftFocusedMessageId == null && leftPath.length > 0) {
      setLeftFocusedMessageId(leftPath[leftPath.length - 1].id);
    }
  }, [leftFocusedMessageId, leftPath]);
  
  useEffect(() => {
    if (!branchPanel) {
      setRightFocusedMessageId(null);
      return;
    }
  
    if (rightFocusedMessageId == null && rightPath.length > 0) {
      setRightFocusedMessageId(rightPath[rightPath.length - 1].id);
    }
  }, [branchPanel, rightFocusedMessageId, rightPath]);

  function handleJumpToMessage(messageId: number, pane: string = "left") {
    if (pane === "single") {
      setBranchPanel(null);
      setLeftFocusedMessageId(messageId);
      setRightFocusedMessageId(null);
  
      requestAnimationFrame(() => {
        const el = messageRefs.current.get(messageId);
  
        if (!el) return;
  
        el.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
  
      return;
    }
  
    const el = messageRefs.current.get(messageId);
  
    if (!el) return;
  
    el.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  
    if (pane === "left") {
      setLeftFocusedMessageId(messageId);
    } else {
      setRightFocusedMessageId(messageId);
    }
  }

  const handlePaneScroll = useCallback((pane: string, path: Message[]) => (e: React.UIEvent<HTMLDivElement>) => {
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
  
    for (const msg of path) {
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
      if (pane == "left") {
          setLeftFocusedMessageId(closestId);
      }
      else {
          setRightFocusedMessageId(closestId);
      }
    }
  }, [mainPath]);

  const childrenMap = buildChildrenMap(messages);
  return (
    <div style={styles.page}>
    <Sidebar
      conversations={conversations}
      selectedConversationId={selectedConversationId}
      loadingConversations={loadingConversations}
      onNewChat={handleNewChat}
      onSelectConversation={setSelectedConversationId}
      onRenameConversation={handleRenameConversation}
      onDeleteConversation={handleDeleteConversation}
      user={null}
      onLogout={() => {}}
    />
    <TreeSidebar
          mainPath={mainPath}
          childrenMap={childrenMap}
          leftFocusedMessageId={leftFocusedMessageId}
          rightFocusedMessageId={rightFocusedMessageId}
          activeLastLeafId={mainLeafId}
          onJumpToMessage={handleJumpToMessage}
          onBranchToggle={handleBranchToggle}      
      />
      <div style = {styles.chatArea}>

        <Breadcrumb
          branchPanel={branchPanel}
          messages={messages}
        />

        <div style={styles.panes}>
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
            onSelectMessage={(msg) => setMainLeafId(msg.id)}
            onOpenBranch={handleOpenBranch}
            childrenMap={childrenMap}
            openBranchId={null}
            registerMessageRef={registerMessageRef}
            onMainScroll={handlePaneScroll("left", mainPath)}
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
                setBranchPanel((prev) => prev ? ({ ...prev, trunkLeafId: msg.id }) : null);
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
              onMainScroll={handlePaneScroll("left", leftPath)}
              onBranchToggle={(messageId, childId) =>
                handleBranchToggle(messageId, childId, branchPanel.trunkLeafId, branchPanel.trunkBranchPointId)
              }
              onJumpToMessage={(id) => handleJumpToMessage(id, "left")}
              branchFromMessage={
                branchPanel.trunkBranchPointId ? messages.find((m) => m.id === branchPanel.trunkBranchPointId) : null
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
                setBranchPanel((prev) => prev ? ({ ...prev, input: value }) : null)
              }
              onSendMessage={handleSendBranchMessage}
              sending={sending}
              onSelectMessage={(msg) => {
                setBranchPanel((prev) => prev ? ({ ...prev, branchLeafId: msg.id }) : null);
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
              onMainScroll={handlePaneScroll("right", rightPath)}
              onBranchToggle={(messageId, childId) =>
                handleBranchToggle(messageId, childId, branchPanel.branchLeafId, branchPanel.branchPointId)
              }
              onJumpToMessage={(id) => handleJumpToMessage(id, "right")}
              branchFromMessage={
                branchPanel.branchPointId? messages.find((m) => m.id === branchPanel.branchPointId) : null
              }
            />
          </>
        )}  
      </div>
    </div>
    </div>
  );
}
