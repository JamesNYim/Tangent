import ConversationItem from "./ConversationItem";

const styles = {
  sidebar: {
    width: "260px",
    borderRight: "1px solid #ddd",
    padding: "16px",
    boxSizing: "border-box",
    overflowY: "auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
};

export default function ConversationSidebar({
  conversations,
  selectedConversationId,
  loadingConversations,
  onNewChat,
  onSelectConversation,
}) 
{
  return (
    <aside style={styles.sidebar}>
      <div style={styles.header}>
        <h2 style={{ margin: 0 }}>Chats</h2>
        <button onClick={onNewChat}>+ New</button>
      </div>

      {loadingConversations ? (
        <p>Loading conversations...</p>
      ) : conversations.length === 0 ? (
        <p>No conversations yet.</p>
      ) : (
        <div style={styles.list}>
          {conversations.map((convo) => (
            <ConversationItem
              key={convo.id}
              convo={convo}
              isActive={convo.id === selectedConversationId}
              onSelect={onSelectConversation}
            />
          ))}
        </div>
      )}
    </aside>
  );
}
