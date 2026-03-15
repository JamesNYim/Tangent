import MessageBubble from "./MessageBubble";

const styles = {
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
};

export default function MessageList({ messages }) {
  return (
    <div style={styles.list}>
      {messages.map((msg) => (
        <MessageBubble key={msg.id} msg={msg} />
      ))}
    </div>
  );
}
