import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

const styles = {
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
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
  error,
  selectedConversationId,
  loadingMessages,
  messages,
  input,
  setInput,
  onSendMessage,
  sending,
}) 
{
  const inputDisabled = !selectedConversationId || sending;

  return (
    <main style={styles.main}>
      <div style={styles.messagesArea}>
        {error && <p style={styles.error}>{error}</p>}

        {selectedConversationId == null ? (
          <p>Select or create a conversation.</p>
        ) : loadingMessages ? (
          <p>Loading messages...</p>
        ) : messages.length === 0 ? (
          <p>No messages yet. Start the conversation.</p>
        ) : (
          <MessageList messages={messages} />
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
