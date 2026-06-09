import React, { useEffect, useRef, useState } from "react";
import { saveAPIKey } from "../../api/apiKeys";
import type { User } from "../../types";

const styles: Record<string, React.CSSProperties> = {
  wrapper: { position: "relative" },
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
  userBlock: { padding: "10px", borderBottom: "1px solid rgba(245,245,220,0.15)", marginBottom: "8px" },
  email: { fontSize: "12px", opacity: 0.7, marginTop: "4px" },
  menuItem: { width: "100%", textAlign: "left", padding: "10px", borderRadius: "10px", border: "none", background: "transparent", color: "#f5f5dc", cursor: "pointer", fontSize: "14px" },
  danger: { color: "#e7a09a" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "24px" },
  modal: { width: "100%", maxWidth: "520px", maxHeight: "80vh", background: "#2f2220", color: "#f5f5dc", border: "2px solid #798262", borderRadius: "22px", boxShadow: "0 18px 60px rgba(0,0,0,0.45)", overflow: "hidden" },
  modalHeader: { padding: "18px 20px", borderBottom: "1px solid rgba(245,245,220,0.14)", display: "flex", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: "18px", fontWeight: "bold" },
  closeButton: { border: "none", background: "transparent", color: "#f5f5dc", fontSize: "22px", cursor: "pointer" },
  modalBody: { padding: "20px", display: "flex", flexDirection: "column", gap: "16px", maxHeight: "60vh", overflowY: "auto" },
  section: { background: "#33352c", border: "1px solid #798262", borderRadius: "16px", padding: "16px" },
  sectionTitle: { fontSize: "14px", fontWeight: "bold", marginBottom: "12px" },
  row: { display: "flex", justifyContent: "space-between", gap: "16px", fontSize: "14px", padding: "8px 0" },
  label: { opacity: 0.75, fontSize: "13px" },
  value: { fontWeight: "bold" },
  apiKeyForm: { display: "flex", flexDirection: "column", gap: "10px" },
  input: { width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #798262", background: "#2f2220", color: "#f5f5dc", outline: "none" },
  message: { fontSize: "13px", opacity: 0.85 },
  footer: { padding: "16px 20px", borderTop: "1px solid rgba(245,245,220,0.14)", display: "flex", justifyContent: "flex-end", gap: "10px" },
  secondaryButton: { padding: "10px 14px", borderRadius: "999px", border: "2px solid #f5f5dc", background: "transparent", color: "#f5f5dc", cursor: "pointer", fontWeight: "bold" },
  primaryButton: { padding: "10px 14px", borderRadius: "999px", border: "2px solid #bb8954", background: "#bb8954", color: "#2f2220", cursor: "pointer", fontWeight: "bold" },
  accountButton: { width: "100%", height: "36px", borderRadius: "2px", background: "#2f2220", color: "#f5f5dc", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", border: "none" },
  avatar: { width: "28px", height: "28px", borderRadius: "50%", background: "#a9b192", color: "#f5f5dc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "bold", margin: "0px 40px 0px 0px" },
  name: { flex: 1, textAlign: "left", fontSize: "14px", fontWeight: "bold" },
};

interface Props {
  user: User | null;
  onLogout: () => void;
  collapsed?: boolean;
}

export default function AccountWidget({ user, onLogout, collapsed }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [provider, setProvider] = useState("openai");
  const [apiKey, setApiKey] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [apiKeyMessage, setApiKeyMessage] = useState("");
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSaveApiKey(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKey.trim()) { setApiKeyMessage("Please enter an API key."); return; }
    try {
      setSavingKey(true);
      setApiKeyMessage("");
      await saveAPIKey(provider, apiKey);
      setApiKey("");
      setApiKeyMessage("API key saved.");
    } catch (err) {
      setApiKeyMessage(err instanceof Error ? err.message : "Failed to save API key.");
    } finally {
      setSavingKey(false);
    }
  }

  if (collapsed || !user) return null;

  const initials = user.username
    ? user.username.slice(0, 2).toUpperCase()
    : "?";

  return (
    <>
      <div ref={accountRef} style={styles.wrapper}>
        <button type="button" style={styles.accountButton} onClick={() => setMenuOpen((prev) => !prev)}>
          <div style={styles.avatar}>{initials}</div>
          <div style={styles.name}>{user.username}</div>
        </button>

        {menuOpen && (
          <div style={styles.menu}>
            <div style={styles.userBlock}>
              <div style={styles.name}>{user.username}</div>
              <div style={styles.email}>{user.email}</div>
            </div>
            <button type="button" style={styles.menuItem} onClick={() => { setMenuOpen(false); setSettingsOpen(true); }}>
              Account settings
            </button>
            <button type="button" style={{ ...styles.menuItem, ...styles.danger }} onClick={onLogout}>
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
              <button type="button" style={styles.closeButton} onClick={() => setSettingsOpen(false)}>×</button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.section}>
                <div style={styles.sectionTitle}>Profile</div>
                <div style={styles.row}><span style={styles.label}>Username</span><span style={styles.value}>{user.username}</span></div>
                <div style={styles.row}><span style={styles.label}>Email</span><span style={styles.value}>{user.email}</span></div>
              </div>
              <div style={styles.section}>
                <div style={styles.sectionTitle}>API Keys</div>
                <form onSubmit={handleSaveApiKey} style={styles.apiKeyForm}>
                  <label style={styles.label}>Provider</label>
                  <select value={provider} onChange={(e) => setProvider(e.target.value)} style={styles.input}>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="google">Google</option>
                    <option value="openrouter">OpenRouter</option>
                  </select>
                  <label style={styles.label}>API Key</label>
                  <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Paste your API key" style={styles.input} />
                  {apiKeyMessage && <div style={styles.message}>{apiKeyMessage}</div>}
                  <button type="submit" style={styles.primaryButton} disabled={savingKey}>
                    {savingKey ? "Saving..." : "Save API Key"}
                  </button>
                </form>
              </div>
            </div>
            <div style={styles.footer}>
              <button type="button" style={styles.secondaryButton} onClick={() => setSettingsOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
