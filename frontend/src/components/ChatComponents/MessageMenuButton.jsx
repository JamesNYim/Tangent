import { useState } from "react";
import { getMessageLabel } from "../../api/messageHelpers";

const styles = {
  wrapper: {
    position: "absolute",
    top: "8px",
    right: "8px",
  },

  button: {
    fontSize: "11px",
    padding: "2px 7px",
    border: "none",
    background: "rgba(0,0,0,0.12)",
    color: "#f5f5d3",
    cursor: "pointer",
    opacity: 0.8,
  },

  menu: {
    position: "absolute",
    top: "28px",
    right: 0,
    zIndex: 50,
    width: "220px",
    background: "#2f2220",
    border: "1px solid #798262",
    borderRadius: "14px",
    padding: "10px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
  },

  sectionTitle: {
    fontSize: "11px",
    opacity: 0.7,
    marginBottom: "6px",
  },

  tangentButton: {
    width: "100%",
    textAlign: "left",
    background: "#33352c",
    color: "#f5f5d3",
    border: "none",
    borderRadius: "10px",
    padding: "8px",
    cursor: "pointer",
    marginBottom: "6px",
  },

  notes: {
    marginTop: "10px",
    fontSize: "12px",
    opacity: 0.85,
    lineHeight: 1.4,
  },
};

export default function MessageMenuButton({
  msg,
  tangents = [],
  isBranchOpen,
  onBranchToggle,
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  function handleNavigateToTangent(tangent) {
    onBranchToggle?.(msg.id, tangent.id);
    setMenuOpen(false);
  }

  return (
    <div style={styles.wrapper} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setMenuOpen((prev) => !prev)}
        style={styles.button}
      >
      {"⋯"}
      </button>

      {menuOpen && (
        <div style={styles.menu}>
          <div style={styles.sectionTitle}>Tangents</div>

          {tangents.map((tangent, index) => (
            <button
              key={tangent.id}
              type="button"
              onClick={() => handleNavigateToTangent(tangent)}
              style={styles.tangentButton}
            >
              {`${getMessageLabel(tangent)}`}
            </button>
          ))}

          <div style={styles.notes}>
            <div style={styles.sectionTitle}>Notes</div>
            {msg.branch_note || "Notes coming soon..."}
          </div>
        </div>
      )}
    </div>
  );
}
