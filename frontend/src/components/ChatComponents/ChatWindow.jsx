import MessageList from "./MessageList";
import MessageInput from "./MessageInput";


function getBorderRadius(position) {
  switch (position) {
    case "left":
      return "15px 0 0 15px";
    case "right":
      return "0 15px 15px 0";
    case "middle":
      return "0";
    default:
      return "15px";
  }
}

function getBorder(position) {
  const base = {
    borderTop: "2px solid #f5f5d3",
    borderBottom: "2px solid #f5f5d3",
  };

  switch (position) {
    case "left":
      return {
        ...base,
        borderLeft: "2px solid #f5f5d3",
        borderRight: "1px solid #f5f5d3", // shared edge → remove
      };

    case "right":
      return {
        ...base,
        borderLeft: "1px solid #f5f5d3", 
        borderRight: "2px solid #f5f5d3",
      };

    case "middle":
      return {
        ...base,
        borderLeft: "none",
        borderRight: "none",
      };

    default:
      return {
        border: "2px solid #f5f5d3",
      };
  }
}

const styles = {
  main: (position) => ({
    backgroundColor: "#2f2220",
    minHeight: 0,
    minWidth: 0,
    width: "100%",
    height: "100%",
    flex: 1,
    display: "flex",
    flexDirection: "column",
    ...getBorder(position),
    borderRadius: getBorderRadius(position),
    overflow: "hidden",
  }),
  branchHeader: {
    padding: "12px",
    borderBottom: "1px solid #798262",
  },
  branchMeta: {
    fontSize: "12px",
    opacity: 0.8,
    marginBottom: "6px",
  },
  branchText: {
    fontSize: "13px",
    borderLeft: "3px solid #bb8954",
    paddingLeft: "8px",
    whiteSpace: "pre-wrap",
  },
  messagesArea: {
    display: "flex",
    flex: 1,
    minHeight: 0,
    padding: "16px",
    overflowY: "auto",
  },
  error: {
    color: "red",
  },
};

export default function ChatWindow({
  position="single",
  error,
  selectedConversationId,
  loadingMessages,
  messages,
  input,
  setInput,
  onSendMessage,
  sending,
  onSelectMessage,
  onOpenBranch,
  branchPointId = null,
  branchFromText = null
}) 
{
  const inputDisabled = !selectedConversationId || sending;

    return (
    <main style={styles.main(position)}>
      {(branchPointId || branchFromText) && (
        <div style={styles.branchHeader}>
          {branchPointId && (
            <div style={styles.branchMeta}>
              Branching from message #{branchPointId}
            </div>
          )}

          {branchFromText && (
            <div style={styles.branchText}>
              “{branchFromText}”
            </div>
          )}
        </div>
    )}  
      <div style={styles.messagesArea}>
        {error && <p style={styles.error}>{error}</p>}

        {selectedConversationId == null ? (
          <p>Select or create a conversation.</p>
        ) : loadingMessages ? (
          <p>Loading messages...</p>
        ) : messages.length === 0 ? (
            <div style={{ margin: "auto" }}>No messages yet...</div>
        ) : (
          <MessageList messages={messages} onSelectMessage={onSelectMessage} onOpenBranch={onOpenBranch} />
        )}
      </div>

      <MessageInput
        input={input}
        setInput={setInput}
        onSendMessage={onSendMessage}
        disabled={inputDisabled}
        sending={sending}
      />
    </main>
  );
}
