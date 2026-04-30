import React, { useEffect, useRef, useState } from "react";

export default function AccountWidget({ user, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const accountRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  return (
    <>
      <div ref={accountRef} style={styles.wrapper}>
        <button
          type="button"
          style={styles.accountButton}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <div style={styles.avatar}>{initials}</div>
          <div style={styles.name}>{user.name}</div>
        </button>

        {menuOpen && (
          <div style={styles.menu}>
            <div style={styles.userBlock}>
              <div style={styles.name}>{user.name}</div>
              <div style={styles.email}>{user.email}</div>
            </div>

            <button
              type="button"
              style={styles.menuItem}
              onClick={() => {
                setMenuOpen(false);
                setSettingsOpen(true);
              }}
            >
              Account settings
            </button>

            <button
              type="button"
              style={{ ...styles.menuItem, ...styles.danger }}
              onClick={onLogout}
            >
              Log out
            </button>
          </div>
        )}
      </div>

      {settingsOpen && (
        <div style={styles.overlay} onClick={() => setSettingsOpen(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>Account Settings</div>

              <button
                type="button"
                style={styles.closeButton}
                onClick={() => setSettingsOpen(false)}
              >
                ×
              </button>
            </div>

            <div style={styles.modalBody}>
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
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => setSettingsOpen(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                style={styles.primaryButton}
                onClick={() => setSettingsOpen(false)}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  wrapper: {
    position: "relative",
  },
  menu: {
    position: "absolute",
    bottom: "44px",
    left: 20,
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

  menuItem: {
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

  modalHeader: {
    padding: "18px 20px",
    borderBottom: "1px solid rgba(245,245,220,0.14)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  modalTitle: {
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

  modalBody: {
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

  secondaryButton: {
    padding: "10px 14px",
    borderRadius: "999px",
    border: "2px solid #f5f5dc",
    background: "transparent",
    color: "#f5f5dc",
    cursor: "pointer",
    fontWeight: "bold",
  },

  primaryButton: {
    padding: "10px 14px",
    borderRadius: "999px",
    border: "2px solid #bb8954",
    background: "#bb8954",
    color: "#2f2220",
    cursor: "pointer",
    fontWeight: "bold",
  },
  accountButton: {
    width: "100%",
    height: "36px",
    borderRadius: "2px",
    background: "#2f2220",
    color: "#f5f5dc",
    fontWeight: "bold",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
  },
  avatar: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    background: "#a9b192",
    color: "#f5f5dc",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: "bold",
    margin:"0px 40px 0px 0px",
  },
  
  name: {
    flex: 1,
    textAlign: "left",
    fontSize: "14px",
  }

};
