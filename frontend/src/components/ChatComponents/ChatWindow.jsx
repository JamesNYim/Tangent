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
    flex: 1,
    display: "flex",
    flexDirection: "column",
    ...getBorder(position),
    borderRadius: getBorderRadius(position),
    overflow: "hidden",
  }),
  messagesArea: {
    flex: 1,
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
  onOpenBranch
}) 
{
  const inputDisabled = !selectedConversationId || sending;

  return (
    <main style={styles.main(position)}>
      <div style={styles.messagesArea}>
        {error && <p style={styles.error}>{error}</p>}

        {selectedConversationId == null ? (
          <p>Select or create a conversation.</p>
        ) : loadingMessages ? (
          <p>Loading messages...</p>
        ) : messages.length === 0 ? (
          <p>No messages yet. Start the conversation.</p>
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
