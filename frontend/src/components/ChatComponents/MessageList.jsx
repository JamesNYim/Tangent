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

export default function MessageList({
  messages,
  onSelectMessage,
  onOpenBranch,
  childrenMap,
  onBranchToggle,
  openBranchRootId,
}) {
  return (
    <div style={styles.list}>
      {messages.map((msg, index) => {
        const allChildren = childrenMap?.get(msg.id) || [];

        const nextMsg = messages[index + 1];
        const mainChild =
          nextMsg?.parent_msg_id === msg.id ? nextMsg : null;

        const branchChildren = allChildren.filter(
          (child) => child.id !== mainChild?.id
        );

        return (
          <MessageBubble
            key={msg.id}
            msg={msg}
            onSelectMessage={onSelectMessage}
            onOpenBranch={onOpenBranch}
            onBranchToggle={onBranchToggle}
            branchChildren={branchChildren}
            isBranchOpen={openBranchRootId === msg.id}
          />
        );
      })}
    </div>
  );
}
