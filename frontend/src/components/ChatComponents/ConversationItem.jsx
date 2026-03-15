const styles = {
  item: {
    textAlign: "left",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #3e4d44",
    background: "#33352c",
    cursor: "pointer",
    outline: "none",
  },
  activeItem: {
    border: "1px solid #a9b192",
    fontWeight: "bold",
  },
};

export default function ConversationItem({ convo, isActive, onSelect }) {
  return (
    <button
      onClick={() => onSelect(convo.id)}
      style={{
        ...styles.item,
        ...(isActive ? styles.activeItem : {}),
      }}
    >
      {convo.title || "Untitled Chat"}
    </button>
  );
}
