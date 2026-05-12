import { useEffect, useRef, useState } from "react";
import ConversationItem from "./ChatComponents/ConversationItem";
import AccountWidget from "./ProfileComponents/AccountWidget";

const MIN_WIDTH = 180;
const MAX_WIDTH = 420;
const COLLAPSED_WIDTH = 56;

export default function Sidebar({
  conversations,
  selectedConversationId,
  loadingConversations,
  onNewChat,
  onSelectConversation,
  onRenameConversation,
  onDeleteConversation,
  user,
  onLogout,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [width, setWidth] = useState(260);

  const resizingRef = useRef(false);

  useEffect(() => {
    function handleMouseMove(e) {
      if (!resizingRef.current || collapsed) return;

      const nextWidth = Math.min(Math.max(e.clientX, MIN_WIDTH), MAX_WIDTH);
      setWidth(nextWidth);
    }

    function handleMouseUp() {
      resizingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [collapsed]);

  function startResize() {
    if (collapsed) return;

    resizingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  return (
    <aside
      style={{
        ...styles.sidebar,
        width: collapsed ? COLLAPSED_WIDTH : width,
      }}
    >
      <div style={styles.header}>
        {!collapsed && <h2 style={styles.title}>Chats</h2>}

        <button
          type="button"
          style={styles.iconButton}
          onClick={() => setCollapsed((prev) => !prev)}
        >
          {collapsed ? "›" : "‹"}
        </button>
      </div>

      {!collapsed && (
        <>
          <button type="button" style={styles.newButton} onClick={onNewChat}>
            + New Chat
          </button>

          <div style={styles.listArea}>
            {loadingConversations ? (
              <p>Loading conversations...</p>
            ) : conversations.length === 0 ? (
              <p>No conversations yet.</p>
            ) : (
              <div style={styles.list}>
                {conversations.map((convo) => (
                  <ConversationItem
                    key={convo.id}
                    convo={convo}
                    isActive={convo.id === selectedConversationId}
                    onSelect={onSelectConversation}
                    onRename={onRenameConversation}
                    onDelete={onDeleteConversation}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <AccountWidget user={user} onLogout={onLogout} collapsed={collapsed} />

      {!collapsed && (
        <div style={styles.resizeHandle} onMouseDown={startResize} />
      )}
    </aside>
  );
}

const styles = {
  sidebar: {
    position: "relative",
    height: "100%",
    backgroundColor: "#3e4d44",
    color: "#f5f5dc",
    marginRight: "3px",
    padding: "16px",
    boxSizing: "border-box",
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },

  title: {
    margin: 0,
  },

  iconButton: {
    border: "none",
    background: "#2f2220",
    color: "#f5f5dc",
    borderRadius: "8px",
    padding: "6px 10px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  newButton: {
    width: "100%",
    padding: "10px",
    borderRadius: "10px",
    border: "none",
    background: "#bb8954",
    color: "#2f2220",
    fontWeight: "bold",
    cursor: "pointer",
    marginBottom: "12px",
  },

  listArea: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
  },

  list: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  resizeHandle: {
    position: "absolute",
    top: 0,
    right: 0,
    width: "6px",
    height: "100%",
    cursor: "col-resize",
  },
};
