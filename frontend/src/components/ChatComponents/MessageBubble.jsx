import { useState } from "react";
import MarkdownRenderer from "./MarkdownRenderer";
import MessageMenuButton from "./MessageMenuButton";

const styles = {
  row: {
    display: "flex",
    width: "100%",
  },

  bubble: {
    maxWidth: "min(72%, 760px)",
    padding: "12px 14px",
    borderRadius: "16px",
    background: "#33352c",
    color: "#f5f5d3",
    position: "relative",
    lineHeight: 1.5,
    wordBreak: "break-word",
    overflowWrap: "anywhere",
    minHeight: "22px",
  },

  userBubble: {
    borderBottomRightRadius: "4px",
  },

  assistantBubble: {
    borderBottomLeftRadius: "4px",
  },

  role: {
    fontSize: "11px",
    fontWeight: "bold",
    marginBottom: "6px",
    opacity: 0.65,
    textTransform: "capitalize",
  },

  content: {
    userSelect: "text",
    cursor: "text",
  },

  popup: {
    position: "fixed",
    zIndex: 9999,
    display: "flex",
    gap: "8px",
    alignItems: "center",
    background: "#2f2220",
    border: "1px solid #798262",
    borderRadius: "14px",
    padding: "8px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
  },

  button: {
    background: "#798262",
    color: "#f5f5d3",
    border: "none",
    borderRadius: "999px",
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: "12px",
    whiteSpace: "nowrap",
  },

  secondaryButton: {
    background: "#4c2b12",
    color: "#f5f5d3",
    border: "none",
    borderRadius: "999px",
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: "12px",
    whiteSpace: "nowrap",
  },

  branchButton: {
    position: "absolute",
    top: "8px",
    right: "8px",
    fontSize: "11px",
    padding: "2px 7px",
    borderRadius: "999px",
    border: "1px solid #f5f5d3",
    background: "rgba(0,0,0,0.12)",
    color: "#f5f5d3",
    cursor: "pointer",
    opacity: 0.8,
  },
};

export default function MessageBubble({
  msg,
  onSelectMessage,
  onOpenBranch,
  onBranchToggle,
  branchChildren = [],
  isBranchOpen = false,
  registerMessageRef,
}) {
  const isUser = msg.role === "user";

  const [selectedText, setSelectedText] = useState("");
  const [popupPosition, setPopupPosition] = useState(null);

  function captureSelection() {
    const selection = window.getSelection();
    const text = selection?.toString()?.trim() || "";

    if (!text || selection.rangeCount === 0) {
      setSelectedText("");
      setPopupPosition(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setSelectedText(text);
    setPopupPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 12,
    });
  }

  function handleBubbleClick() {
    const selection = window.getSelection()?.toString()?.trim() || "";
    if (selection) return;

    onSelectMessage?.(msg.id);

    const rect = document
      .querySelector(`[data-message-id="${msg.id}"]`)
      ?.getBoundingClientRect();

    setSelectedText("");
    setPopupPosition({
      x: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
      y: rect ? rect.top - 12 : window.innerHeight / 2,
    });
  }

  function clearSelection(e) {
    e.stopPropagation();
    setSelectedText("");
    setPopupPosition(null);
    window.getSelection()?.removeAllRanges();
  }

  function handleBranchWholeMessage(e) {
    e.stopPropagation();
    onOpenBranch?.(msg, null);
    setPopupPosition(null);
    setSelectedText("");
  }

  function handleBranchSelection(e) {
    e.stopPropagation();
    if (!selectedText.trim()) return;

    onOpenBranch?.(msg, selectedText);
    setPopupPosition(null);
    setSelectedText("");
  }

  function handleToggleBranch(e) {
    e.stopPropagation();

    const firstBranchChild = branchChildren.find(
      (child) => child.branch_from_message_id === msg.id
    );

    if (!firstBranchChild) return;

    onBranchToggle?.(msg.id, firstBranchChild.id);
  }

  const explicitBranchChildren = branchChildren.filter(
    (child) => child.branch_from_message_id === msg.id
  );

  const isBranchPoint = explicitBranchChildren.length > 0;

  return (
    <div
      ref={(el) => registerMessageRef?.(msg.id, el)}
      data-message-id={msg.id}
      style={{
        ...styles.row,
        justifyContent: isUser ? "flex-end" : "flex-start",
      }}
    >
      <div
        style={{
          ...styles.bubble,
          ...(isUser ? styles.userBubble : styles.assistantBubble),
          paddingRight: isBranchPoint ? "38px" : "14px",
        }}
      >
        <div style={styles.role}>{msg.role}</div>

        <div
          style={styles.content}
          onMouseUp={(e) => {
            captureSelection();

            const selection = window.getSelection()?.toString()?.trim() || "";
            if (selection) e.stopPropagation();
          }}
          onKeyUp={captureSelection}
        >
          <MarkdownRenderer content={msg.content || ""} />
        </div>

        <MessageMenuButton
          msg={msg}
          tangents={explicitBranchChildren}
          isBranchOpen={isBranchOpen}
          onBranchToggle={onBranchToggle}
        />

        {popupPosition && (
          <div
            style={{
              ...styles.popup,
              left: popupPosition.x,
              top: popupPosition.y,
              transform: "translate(-50%, -100%)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={handleBranchWholeMessage}
              style={styles.button}
            >
              Branch message
            </button>

            {selectedText && (
              <button
                type="button"
                onClick={handleBranchSelection}
                style={styles.button}
              >
                Branch selection
              </button>
            )}

            <button
              type="button"
              onClick={clearSelection}
              style={styles.secondaryButton}
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
