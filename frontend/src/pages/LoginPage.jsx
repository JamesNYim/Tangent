import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/auth";
import { useAuth } from "../auth/AuthContext";
import RegisterButton from "../components/RegisterButton";

const styles = {
  page: {
    minHeight: "100vh",
    background: "#2f2220",
    color: "#f5f5dc",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
  },

  card: {
    width: "100%",
    maxWidth: "420px",
    background: "#3e4d44",
    border: "1px solid #798262",
    borderRadius: "18px",
    padding: "28px",
    boxShadow: "0 12px 30px rgba(0, 0, 0, 0.35)",
    alignItems: "center",
    justifyContent: "center",
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

  registerWrap: {
    marginTop: "16px",
  },
};

export default function LoginPage() {
  const nav = useNavigate();
  const { setSessionFromToken } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    try {
      const data = await login(username, password);
      const token = data.access_token;

      if (!token) {
        throw new Error("No token returned from login");
      }

      await setSessionFromToken(token);
      nav("/");
    } catch (error) {
      setErr(error.message);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>Login</h2>

        <form style={styles.form} onSubmit={onSubmit}>
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
            Login
          </button>
        </form>

        <div style={styles.registerWrap}>
          <RegisterButton />
        </div>
      </div>
    </div>
  );
}
