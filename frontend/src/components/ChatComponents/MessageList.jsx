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

export default function MessageList({ messages, onSelectMessage, onOpenBranch, childrenMap, onBranchToggle, openBranchRootId}) {
  return (
    <div style={styles.list}>
      {messages.map((msg) => (
        <MessageBubble 
          key={msg.id} 
          msg={msg} 
          onSelectMessage={onSelectMessage} 
          onOpenBranch={onOpenBranch} 
          branchChildren={childrenMap?.get(msg.id) || []} 
          onBranchToggle={onBranchToggle}
          isBranchOpen={openBranchRootId === msg.id}
        />
      ))}
    </div>
  );
}
