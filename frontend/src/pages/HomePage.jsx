import { useNavigate } from "react-router-dom";
import TreeLogo from "../components/TreeLogo"; // keep your existing import

const styles = {
  page: {
    position: "fixed",
    inset: 0,
    background: "#2f2220",
    color: "#f5f5dc",
    display: "flex",
    justifyContent: "center",
    padding: "48px 24px",
    boxSizing: "border-box",
    overflowY: "auto",
  },

  card: {
    width: "100%",
    maxWidth: "1200px",
    display: "flex",
    gap: "40px",
    background: "#33352c",
    border: "1px solid #798262",
    borderRadius: "24px",
    padding: "40px 48px",
    boxShadow: "0 12px 30px rgba(0, 0, 0, 0.35)",
    margin: "auto 0",
    boxSizing: "border-box",
  },

  left: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    textAlign: "left",
  },

  right: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 0,
  },

  title: {
    fontSize: "48px",
    margin: "0 0 12px",
    lineHeight: 1.05,
  },

  subtitle: {
    fontSize: "16px",
    opacity: 0.75,
    lineHeight: 1.6,
    marginBottom: "20px",
  },

  buttonRow: {
    display: "flex",
    gap: "12px",
    marginTop: "16px",
  },

  primaryButton: {
    padding: "12px 20px",
    borderRadius: "10px",
    border: "none",
    background: "#798262",
    color: "#2f2220",
    fontWeight: "600",
    cursor: "pointer",
  },

  secondaryButton: {
    padding: "12px 20px",
    borderRadius: "10px",
    border: "1px solid #798262",
    background: "transparent",
    color: "#f5f5dc",
    cursor: "pointer",
  },

  heroGraphic: {
    width: "100%",
    maxWidth: "500px",
    maxHeight: "640px",
    overflow: "auto",
  },

  featureRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "12px",
    marginTop: "28px",
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

  cardWrapper: {
    position: "relative",
    width: "100%",
    maxWidth: "1200px",
    margin: "auto 0",
  },
  eyebrow: {
    color: "#bb8954",
    fontSize: "14px",
    fontWeight: "bold",
    letterSpacing: "1px",
    textTransform: "uppercase",
    marginBottom: "12px",
  },
};

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div style={styles.page}>
      <div style={styles.cardWrapper}>
        <div style={styles.eyebrow}>Tangent AI</div>
        <div style={styles.card}>
          
          {/* LEFT COLUMN (unchanged content, just wrapped) */}
          <div style={styles.left}>
            <h1 style={styles.title}>
              Conversations that branch
            </h1>

            <p style={styles.subtitle}>
              Explore ideas without losing your main thread. Tangent lets you branch
              from any message and follow side thoughts naturally.
            </p>

            <div style={styles.buttonRow}>
              <button
                style={styles.primaryButton}
                onClick={() => navigate("/register")}
              >
                Get Started
              </button>

              <button
                style={styles.secondaryButton}
                onClick={() => navigate("/login")}
              >
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
          </div>

          {/* RIGHT COLUMN (your tree, unchanged) */}
          <div style={styles.right}>
            <div style={styles.heroGraphic} className="hide-scrollbar">
              <TreeLogo />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
