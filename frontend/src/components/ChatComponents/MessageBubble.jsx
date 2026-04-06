const styles = {
  row: {
    display: "flex",
    width: "100%"
  },
  bubble: {
    maxWidth: "70%",
    padding: "12px",
    borderRadius: "10px",
    background: "#33352c",
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
};

export default function MessageBubble({ msg, onSelectMessage, onOpenBranch }) {
  const isUser = msg.role === "user";

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
        style={styles.bubble}
      >
        <div style={styles.role}>{msg.role}</div>
        <div>{msg.content}</div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenBranch(msg);
          }}
        >
          Branch
        </button>
      </div>
    </div>
  );
}
