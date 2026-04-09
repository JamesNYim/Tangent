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
  itemButton: {
    flex: 1,
    textAlign: "left",
    background: "transparent",
    border: "none",
    color: "inherit",
    cursor: "pointer",
    padding: "4px 0",
  },
  renameButton: {
    background: "transparent",
    border: "1px solid #ccc",
    borderRadius: "6px",
    padding: "4px 8px",
    cursor: "pointer",
    color: "inherit",
  },
};

export default function ConversationItem({ convo, isActive, onSelect, onRename }) {
  return (
    <div
      style={{
        ...styles.item,
        ...(isActive ? styles.activeItem : {}),
      }}
    >
      <button
        type="button"
        onClick={() => onSelect(convo.id)}
        style={styles.itemButton}
      >
        {convo.title}
      </button>

      <button
        type="button"
        onClick={() => onRename(convo.id, convo.title)}
        style={styles.renameButton}
      >
        Rename
      </button>
    </div>
  );
}
