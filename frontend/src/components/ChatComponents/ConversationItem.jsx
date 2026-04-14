import { useState } from "react";
import DropdownMenu from "./DropdownMenu";

const styles = {
  item: {
    position: "relative",
    display: "flex",
    justifyContent: "space-between",
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
  conversationMenuButton: {
    background: "transparent",
    border: "none",
    color: "#aaa",
    cursor: "pointer",
    fontSize: "18px",
    padding: "0 6px",
  },
};

export default function ConversationItem({
  convo,
  isActive,
  onSelect,
  onRename,
  onDelete,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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

      {isHovered && (
        <button
          type="button"
          style={styles.conversationMenuButton}
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu((prev) => !prev);
          }}
        >
          ⋯
        </button>
      )}

      {showMenu && (
        <DropdownMenu
          convoId={convo.id}
          convoTitle={convo.title}
          onRename={onRename}
          onDelete={onDelete}
          onClose={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}
