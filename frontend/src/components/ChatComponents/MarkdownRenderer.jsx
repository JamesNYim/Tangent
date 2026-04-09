import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const styles = {
  inlineCode: {
    background: "#222",
    padding: "2px 6px",
    borderRadius: "4px",
    fontSize: "0.9em",
  },
  codeBlockWrap: {
    marginTop: "8px",
  },
  codeHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#1e1e1e",
    color: "#f5f5d3",
    fontSize: "12px",
    padding: "6px 10px",
    borderTopLeftRadius: "8px",
    borderTopRightRadius: "8px",
  },
  codeBlock: {
    background: "#1e1e1e",
    padding: "12px",
    overflowX: "auto",
    margin: 0,
    borderBottomLeftRadius: "8px",
    borderBottomRightRadius: "8px",
  },
  codeText: {
    fontFamily: "monospace",
    fontSize: "13px",
  },
};

export default function MarkdownRenderer({ content }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          const language = match ? match[1] : null;

          if (inline) {
            return (
              <code style={styles.inlineCode} {...props}>
                {children}
              </code>
            );
          }

          return (
            <div style={styles.codeBlockWrap}>
              {language && (
                <div style={styles.codeHeader}>
                  <span>{language}</span>
                </div>
              )}
              <pre style={styles.codeBlock}>
                <code className={className} style={styles.codeText} {...props}>
                  {children}
                </code>
              </pre>
            </div>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
