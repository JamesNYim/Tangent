import React from "react";

const styles = {
  card: {
    position: "absolute",
    top: "48px",
    right: "0",
    width: "220px",
    background: "#33352c",
    border: "1px solid #798262",
    borderRadius: "16px",
    padding: "12px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
    zIndex: 1000,
  },

  header: {
    padding: "10px",
    borderBottom: "1px solid rgba(245,245,220,0.15)",
    marginBottom: "8px",
  },

  name: {
    fontWeight: "bold",
    fontSize: "14px",
  },

  email: {
    fontSize: "12px",
    opacity: 0.7,
  },

  item: {
    padding: "10px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "14px",
  },

  itemHover: {
    background: "#44463a",
  },
};

export default function ProfileCard({
  user,
  onClose,
  onNavigateProfile,
  onLogout,
}) {
  const [hovered, setHovered] = React.useState(null);

  function renderItem(label, onClick, key) {
    return (
      <div
        key={key}
        style={{
          ...styles.item,
          ...(hovered === key ? styles.itemHover : {}),
        }}
        onMouseEnter={() => setHovered(key)}
        onMouseLeave={() => setHovered(null)}
        onClick={() => {
          onClick();
          onClose();
        }}
      >
        {label}
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div style={styles.name}>{user.name}</div>
        <div style={styles.email}>{user.email}</div>
      </div>

      {renderItem("Profile", onNavigateProfile, "profile")}
      {renderItem("Settings", () => console.log("settings"), "settings")}
      {renderItem("Logout", onLogout, "logout")}
    </div>
  );
}
