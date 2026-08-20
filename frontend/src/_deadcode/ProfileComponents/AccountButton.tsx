import React from "react";

const styles = {
  button: {
    width: "36px",
    height: "36px",
    borderRadius: "2px",
    border: "2px solid #f5f5dc",
    background: "#3e4d44",
    color: "#2f2220",
    fontWeight: "bold",
    cursor: "pointer",
  },
};

export default function AccountButton({ user, onClick }) {
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  return (
    <button type="button" style={styles.button} onClick={onClick}>
      {initials}
    </button>
  );
}
