import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { register } from "../api/auth";
import LoginButton from "../components/LoginButton";

const styles = {
  page: {
    position: "fixed",
    inset: 0,
    background: "#2f2220",
    color: "#f5f5dc",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    boxSizing: "border-box",
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    background: "#3e4d44",
    border: "1px solid #798262",
    borderRadius: "18px",
    padding: "28px",
    boxShadow: "0 12px 30px rgba(0, 0, 0, 0.35)",
  },
  title: {
    margin: "0 0 20px",
    fontSize: "28px",
    color: "#f5f5dc",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  label: {
    fontSize: "13px",
    opacity: 0.85,
  },
  input: {
    padding: "10px 14px",
    background: "#33352c",
    color: "#f5f5dc",
    border: "2px solid #798262",
    borderRadius: "14px",
    outline: "none",
    fontSize: "15px",
  },
  error: {
    color: "#ff8a8a",
    fontSize: "14px",
    margin: "4px 0",
  },
  button: {
    marginTop: "8px",
    padding: "10px 14px",
    background: "#bb8954",
    color: "#2f2220",
    border: "none",
    borderRadius: "14px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "15px",
  },
  switchWrap: {
    marginTop: "16px",
  },
};

export default function RegisterPage() {
  const nav = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    try {
      await register(email, username, password);
      nav("/login");
    } catch (error) {
      setErr(error.message);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>Register</h2>

        <form style={styles.form} onSubmit={onSubmit}>
          <label style={styles.label}>Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />

          <label style={styles.label}>Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={styles.input}
          />

          <label style={styles.label}>Password</label>
          <input
            value={password}
            type="password"
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />

          {err && <p style={styles.error}>{err}</p>}

          <button style={styles.button} type="submit">
            Create account
          </button>
        </form>

        <div style={styles.switchWrap}>
          <LoginButton />
        </div>
      </div>
    </div>
  );
}
