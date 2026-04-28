import React from "react";

const styles = {
  menu: {
    position: "absolute",
    top: "44px",
    right: 0,
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

  name: {
    fontSize: "14px",
    fontWeight: "bold",
  },

  email: {
    fontSize: "12px",
    opacity: 0.7,
    marginTop: "4px",
  },

  item: {
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
};

export default function AccountMenu({ user, onOpenSettings, onLogout }) {
  return (
    <div style={styles.menu}>
      <div style={styles.userBlock}>
        <div style={styles.name}>{user.name}</div>
        <div style={styles.email}>{user.email}</div>
      </div>

      <button type="button" style={styles.item} onClick={onOpenSettings}>
        Account settings
      </button>

      <button
        type="button"
        style={{ ...styles.item, ...styles.danger }}
        onClick={onLogout}
      >
        Log out
      </button>
    </div>
  );
}
