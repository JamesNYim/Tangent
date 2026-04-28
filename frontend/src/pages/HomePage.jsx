import React from "react";
import { useNavigate } from "react-router-dom";
import TreeLogo from "../components/TreeLogo";

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
    maxWidth: "720px",
    background: "#33352c",
    border: "1px solid #798262",
    borderRadius: "24px",
    padding: "42px",
    boxShadow: "0 12px 30px rgba(0, 0, 0, 0.35)",
    textAlign: "center",
  },

  eyebrow: {
    color: "#bb8954",
    fontSize: "14px",
    fontWeight: "bold",
    letterSpacing: "1px",
    textTransform: "uppercase",
    marginBottom: "12px",
  },

  title: {
    fontSize: "48px",
    margin: "0 0 16px",
    lineHeight: 1.05,
  },

  subtitle: {
    fontSize: "18px",
    opacity: 0.85,
    maxWidth: "560px",
    margin: "0 auto 28px",
  },

  buttonRow: {
    display: "flex",
    gap: "12px",
    justifyContent: "center",
    flexWrap: "wrap",
  },

  primaryButton: {
    padding: "12px 18px",
    background: "#bb8954",
    color: "#2f2220",
    border: "none",
    borderRadius: "14px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "15px",
  },

  secondaryButton: {
    padding: "12px 18px",
    background: "transparent",
    color: "#f5f5dc",
    border: "1px solid #798262",
    borderRadius: "14px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "15px",
  },

  featureRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "12px",
    marginTop: "32px",
  },

  feature: {
    background: "#2f2220",
    border: "1px solid #798262",
    borderRadius: "16px",
    padding: "16px",
    textAlign: "left",
  },

  featureTitle: {
    color: "#bb8954",
    margin: "0 0 6px",
    fontSize: "15px",
  },

  featureText: {
    margin: 0,
    fontSize: "14px",
    opacity: 0.8,
  },
  heroGraphic: {
    display: "flex",
    justifyContent: "center",
    margin: "32px 0",
  },
};

export default function HomePage() {
  const nav = useNavigate();

  return (
    <div style={styles.page}>
      <main style={styles.card}>
        <div style={styles.eyebrow}>Tangent AI</div>
        <div style={styles.heroGraphic}>
          <TreeLogo seed={7} />
        </div>

        <h1 style={styles.title}>
          Conversations that can branch.
        </h1>

        <p style={styles.subtitle}>
          Explore ideas without losing your main thread. Tangent lets you branch
          from any message and follow side thoughts naturally.
        </p>

        <div style={styles.buttonRow}>
          <button style={styles.primaryButton} onClick={() => nav("/register")}>
            Get started
          </button>

          <button style={styles.secondaryButton} onClick={() => nav("/login")}>
            Login
          </button>
        </div>

        <section style={styles.featureRow}>
          <div style={styles.feature}>
            <h3 style={styles.featureTitle}>Branch from any message</h3>
            <p style={styles.featureText}>
              Turn side questions into separate paths.
            </p>
          </div>

          <div style={styles.feature}>
            <h3 style={styles.featureTitle}>Keep your main thread clean</h3>
            <p style={styles.featureText}>
              No more derailing the original conversation.
            </p>
          </div>

          <div style={styles.feature}>
            <h3 style={styles.featureTitle}>Explore ideas visually</h3>
            <p style={styles.featureText}>
              Navigate conversations like a tree instead of a line.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
