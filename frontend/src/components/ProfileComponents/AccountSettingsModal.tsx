import React from "react";

const styles = {
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

  header: {
    padding: "18px 20px",
    borderBottom: "1px solid rgba(245,245,220,0.14)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: {
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

  body: {
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

  button: {
    padding: "10px 14px",
    borderRadius: "999px",
    border: "2px solid #f5f5dc",
    background: "transparent",
    color: "#f5f5dc",
    cursor: "pointer",
    fontWeight: "bold",
  },

  primaryButton: {
    background: "#bb8954",
    borderColor: "#bb8954",
    color: "#2f2220",
  },
};

export default function AccountSettingsModal({ user, onClose }) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.title}>Account Settings</div>

          <button type="button" style={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <div style={styles.body}>
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Profile</div>

            <div style={styles.row}>
              <span style={styles.label}>Name</span>
              <span style={styles.value}>{user.name}</span>
            </div>

            <div style={styles.row}>
              <span style={styles.label}>Email</span>
              <span style={styles.value}>{user.email}</span>
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
          <button type="button" style={styles.button} onClick={onClose}>
            Cancel
          </button>

          <button
            type="button"
            style={{ ...styles.button, ...styles.primaryButton }}
            onClick={onClose}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
