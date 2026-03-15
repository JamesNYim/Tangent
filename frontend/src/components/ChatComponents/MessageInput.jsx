const styles = {
  form: {
    display: "flex",
    gap: "8px",
    padding: "16px",
    borderTop: "1px solid #ddd",
  },
  input: {
    flex: 1,
    padding: "10px",
    background: "#33352c",
    border: "1px solid #f5f5dc",
    outline: "none",
  },
};

export default function MessageInput({
  input,
  setInput,
  onSendMessage,
  disabled,
  sending,
}) {
  return (
    <form onSubmit={onSendMessage} style={styles.form}>
      <input
        type="text"
        placeholder="Type your message..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        disabled={disabled}
        style={styles.input}
      />
      <button type="submit" disabled={disabled}>
        {sending ? "Sending..." : "Send"}
      </button>
    </form>
  );
}
