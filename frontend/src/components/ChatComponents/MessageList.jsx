import MessageBubble from "./MessageBubble";

const styles = {
  list: {
    display: "flex",
    width: "100%",
    minWidth: 0,
    flex: 1,
    flexDirection: "column",
    gap: "12px",
  },
};

export default function MessageList({ messages, onSelectMessage, onOpenBranch }) {
  return (
    <div style={styles.list}>
      {messages.map((msg) => (
        <MessageBubble key={msg.id} msg={msg} onSelectMessage={onSelectMessage} onOpenBranch={onOpenBranch} />
      ))}
    </div>
  );
}
