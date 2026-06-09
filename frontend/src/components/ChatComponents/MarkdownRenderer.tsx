import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const styles: Record<string, React.CSSProperties> = {
  paragraph: { margin: 0 },
  list: { margin: "6px 0", paddingLeft: "18px" },
  codeInline: { background: "#2a2d26", padding: "2px 6px", borderRadius: "6px", fontSize: "0.9em" },
  codeBlock: { background: "#2a2d26", padding: "10px", borderRadius: "8px", overflowX: "auto", margin: "8px 0", fontSize: "0.9em" },
  blockquote: { borderLeft: "3px solid #bb8954", paddingLeft: "10px", margin: "8px 0", opacity: 0.9 },
  table: { borderCollapse: "collapse", margin: "8px 0", width: "100%" },
  th: { borderBottom: "1px solid #666", padding: "6px", textAlign: "left" },
  td: { borderBottom: "1px solid #444", padding: "6px" },
};

interface Props {
  content: string;
}

export default function MarkdownRenderer({ content }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p style={styles.paragraph}>{children}</p>,
        ul: ({ children }) => <ul style={styles.list}>{children}</ul>,
        ol: ({ children }) => <ol style={styles.list}>{children}</ol>,
        code({ children, className }) {
          const isBlock = !!className;
          return isBlock ? (
            <pre style={styles.codeBlock}><code>{children}</code></pre>
          ) : (
            <code style={styles.codeInline}>{children}</code>
          );
        },
        blockquote: ({ children }) => <blockquote style={styles.blockquote}>{children}</blockquote>,
        table: ({ children }) => <table style={styles.table}>{children}</table>,
        th: ({ children }) => <th style={styles.th}>{children}</th>,
        td: ({ children }) => <td style={styles.td}>{children}</td>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
