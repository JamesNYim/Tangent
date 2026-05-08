import { useEffect, useRef, useState } from "react";
import ConversationItem from "./ChatComponents/ConversationItem";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const accountRef = useRef(null);
  const resizingRef = useRef(false);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  useEffect(() => {
    function handleClickOutside(e) {
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    <>
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

        <div ref={accountRef} style={styles.accountWrapper}>
          <button
            type="button"
            style={{
              ...styles.accountButton,
              ...(collapsed ? styles.collapsedAccountButton : {}),
            }}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <div style={styles.avatar}>{initials}</div>
            {!collapsed && <div style={styles.accountName}>{user?.name}</div>}
          </button>

          {menuOpen && (
            <div
              style={{
                ...styles.menu,
                left: collapsed ? COLLAPSED_WIDTH + 8 : 12,
              }}
            >
              <div style={styles.userBlock}>
                <div style={styles.menuName}>{user?.name}</div>
                <div style={styles.email}>{user?.email}</div>
              </div>

              <button
                type="button"
                style={styles.menuItem}
                onClick={() => {
                  setMenuOpen(false);
                  setSettingsOpen(true);
                }}
              >
                Account settings
              </button>

              <button
                type="button"
                style={{ ...styles.menuItem, ...styles.danger }}
                onClick={onLogout}
              >
                Log out
              </button>
            </div>
          )}
        </div>

        {!collapsed && <div style={styles.resizeHandle} onMouseDown={startResize} />}
      </aside>

      {settingsOpen && (
        <div style={styles.overlay} onClick={() => setSettingsOpen(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>Account Settings</div>

              <button
                type="button"
                style={styles.closeButton}
                onClick={() => setSettingsOpen(false)}
              >
                ×
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.section}>
                <div style={styles.sectionTitle}>Profile</div>

                <div style={styles.row}>
                  <span style={styles.label}>Name</span>
                  <span style={styles.value}>{user?.name}</span>
                </div>

                <div style={styles.row}>
                  <span style={styles.label}>Email</span>
                  <span style={styles.value}>{user?.email}</span>
                </div>
              </div>

              <div style={styles.section}>
                <div style={styles.sectionTitle}>Preferences</div>

                <div style={styles.row}>
                  <span style={styles.label}>Theme</span>
                  <span style={styles.value}>Tangent Dark</span>
                </div>

                <div style={styles.row}>
                  <span style={styles.label}>Branch behavior</span>
                  <span style={styles.value}>Floating panes</span>
                </div>
              </div>
            </div>

            <div style={styles.footer}>
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => setSettingsOpen(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                style={styles.primaryButton}
                onClick={() => setSettingsOpen(false)}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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

  accountWrapper: {
    position: "relative",
    marginTop: "auto",
  },

  accountButton: {
    width: "100%",
    minHeight: "42px",
    borderRadius: "10px",
    border: "none",
    background: "#2f2220",
    color: "#f5f5dc",
    fontWeight: "bold",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "7px",
    boxSizing: "border-box",
    justifyContent: "flex-start"
  },
  collapsedAccountButton: {
    background: "none",
    justifyContent: "center",
    alignItems: "center",
    marginTop: "auto",
  },

  avatar: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    background: "#a9b192",
    color: "#2f2220",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: "bold",
    flexShrink: 0,
  },

  accountName: {
    flex: 1,
    textAlign: "left",
    fontSize: "14px",
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
  },

  menu: {
    position: "fixed",
    bottom: "64px",
    width: "220px",
    background: "#33352c",
    border: "1px solid #798262",
    borderRadius: "14px",
    padding: "10px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
    zIndex: 50,
  },

  userBlock: {
    padding: "10px",
    borderBottom: "1px solid rgba(245,245,220,0.15)",
    marginBottom: "8px",
  },

  menuName: {
    fontSize: "14px",
    fontWeight: "bold",
  },

  email: {
    fontSize: "12px",
    opacity: 0.7,
    marginTop: "4px",
  },

  menuItem: {
    width: "100%",
    textAlign: "left",
    padding: "10px",
    borderRadius: "10px",
    border: "none",
    background: "transparent",
    color: "#f5f5dc",
    cursor: "pointer",
    fontSize: "14px",
  },

  danger: {
    color: "#e7a09a",
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    padding: "24px",
  },

  modal: {
    width: "100%",
    maxWidth: "520px",
    background: "#2f2220",
    color: "#f5f5dc",
    border: "2px solid #798262",
    borderRadius: "22px",
    boxShadow: "0 18px 60px rgba(0,0,0,0.45)",
    overflow: "hidden",
  },

  modalHeader: {
    padding: "18px 20px",
    borderBottom: "1px solid rgba(245,245,220,0.14)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  modalTitle: {
    fontSize: "18px",
    fontWeight: "bold",
  },

  closeButton: {
    border: "none",
    background: "transparent",
    color: "#f5f5dc",
    fontSize: "22px",
    cursor: "pointer",
  },

  modalBody: {
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },

  section: {
    background: "#33352c",
    border: "1px solid #798262",
    borderRadius: "16px",
    padding: "16px",
  },

  sectionTitle: {
    fontSize: "14px",
    fontWeight: "bold",
    marginBottom: "12px",
  },

  row: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    fontSize: "14px",
    padding: "8px 0",
  },

  label: {
    opacity: 0.75,
  },

  value: {
    fontWeight: "bold",
  },

  footer: {
    padding: "16px 20px",
    borderTop: "1px solid rgba(245,245,220,0.14)",
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
  },

  secondaryButton: {
    padding: "10px 14px",
    borderRadius: "999px",
    border: "2px solid #f5f5dc",
    background: "transparent",
    color: "#f5f5dc",
    cursor: "pointer",
    fontWeight: "bold",
  },

  primaryButton: {
    padding: "10px 14px",
    borderRadius: "999px",
    border: "2px solid #bb8954",
    background: "#bb8954",
    color: "#2f2220",
    cursor: "pointer",
    fontWeight: "bold",
  },
};
