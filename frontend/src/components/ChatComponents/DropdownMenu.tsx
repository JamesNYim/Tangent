import React, { useEffect, useRef } from "react";

const styles: Record<string, React.CSSProperties> = {
  dropdown: {
    position: "absolute",
    right: "10px",
    top: "40px",
    background: "#2f322b",
    border: "1px solid #555",
    borderRadius: "6px",
    display: "flex",
    flexDirection: "column",
    zIndex: 10,
    padding: "4px 0",
  },
  dropdownButton: {
    width: "100%",
    textAlign: "left",
    padding: "4px 24px 4px 8px",
    background: "transparent",
    border: "none",
    color: "inherit",
    cursor: "pointer",
  },
};

interface Props {
  convoId: number;
  convoTitle: string;
  onRename: (id: number, title: string) => void;
  onDelete: (id: number) => void;
  onClose: () => void;
}

export default function DropdownMenu({ convoId, convoTitle, onRename, onDelete, onClose }: Props) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div ref={dropdownRef} style={styles.dropdown}>
      <button
        type="button"
        style={styles.dropdownButton}
        onClick={() => { onRename(convoId, convoTitle); onClose(); }}
      >
        Rename
      </button>
      <button
        type="button"
        style={styles.dropdownButton}
        onClick={() => { onDelete(convoId); onClose(); }}
      >
        Delete
      </button>
    </div>
  );
}
