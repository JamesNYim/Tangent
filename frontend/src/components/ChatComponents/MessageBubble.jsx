import { useState } from "react";

const styles = {
  row: {
    display: "flex",
    width: "100%",
  },
  bubble: {
    maxWidth: "70%",
    padding: "12px",
    borderRadius: "10px",
    background: "#33352c",
    position: "relative",
    whiteSpace: "pre-wrap",
  },
  userBubble: {
    background: "#33352c",
  },
  assistantBubble: {
    background: "#33352c",
  },
  role: {
    fontSize: "12px",
    fontWeight: "bold",
    marginBottom: "4px",
    textTransform: "capitalize",
  },
  content: {
    lineHeight: 1.5,
    userSelect: "text",
    cursor: "text",
  },
  actions: {
    display: "flex",
    gap: "8px",
    marginTop: "10px",
    flexWrap: "wrap",
  },
  button: {
    background: "#798262",
    color: "#f5f5d3",
    border: "none",
    borderRadius: "8px",
    padding: "6px 10px",
    cursor: "pointer",
  },
  secondaryButton: {
    background: "#4c2b12",
    color: "#f5f5d3",
    border: "none",
    borderRadius: "8px",
    padding: "6px 10px",
    cursor: "pointer",
  },
  selectionPreview: {
    marginTop: "8px",
    fontSize: "12px",
    opacity: 0.9,
    borderLeft: "3px solid #bb8954",
    paddingLeft: "8px",
  },
};

export default function MessageBubble({ msg, onSelectMessage, onOpenBranch }) {
  const isUser = msg.role === "user";
  const [selectedText, setSelectedText] = useState("");

  function captureSelection() {
    const selection = window.getSelection();
    const text = selection?.toString()?.trim() || "";
    setSelectedText(text);
  }

  function clearSelection(e) {
    e.stopPropagation();
    setSelectedText("");
    window.getSelection()?.removeAllRanges();
  }

  function handleBranchWholeMessage(e) {
    e.stopPropagation();
    setSelectedText("");
    onOpenBranch?.(msg, null);
  }

  function handleBranchSelection(e) {
    e.stopPropagation();
    if (!selectedText.trim()) return;
    onOpenBranch(msg, selectedText);
  }

  return (
    <div
      style={{
        ...styles.row,
        justifyContent: isUser ? "flex-end" : "flex-start",
      }}
    >
      <div
        onClick={() => {
          onSelectMessage?.(msg.id);
          console.log("clicked msg: ", msg.id);
        }}
        style={{
          ...styles.bubble,
          ...(isUser ? styles.userBubble : styles.assistantBubble),
        }}
      >
        <div style={styles.role}>{msg.role}</div>

        <div
          style={styles.content}
          onMouseUp={captureSelection}
          onKeyUp={captureSelection}
        >
          {msg.content}
        </div>

        <div style={styles.actions}>
          <button onClick={handleBranchWholeMessage} style={styles.button}>
            Branch message
          </button>

          {selectedText && (
            <>
              <button onClick={handleBranchSelection} style={styles.button}>
                Branch selection
              </button>

              <button onClick={clearSelection} style={styles.secondaryButton}>
                Clear selection
              </button>
            </>
          )}
        </div>

        {selectedText && (
          <div style={styles.selectionPreview}>
            <strong>Selected:</strong> “{selectedText}”
          </div>
        )}
      </div>
    </div>
  );
}
