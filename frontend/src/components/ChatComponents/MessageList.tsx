import MessageBubble from "./MessageBubble";
import type { Message } from "../../types";

const styles: React.CSSProperties = {
  display: "flex",
  width: "100%",
  minWidth: 0,
  flex: 1,
  flexDirection: "column",
  gap: "12px",
};

interface Props {
  messages: Message[];
  onSelectMessage?: (id: number) => void;
  onOpenBranch?: (msg: Message, selectedText: string | null, childId?: number | null) => void;
  onBranchToggle?: (messageId: number, childId: number) => void;
  childrenMap: Map<number | null, Message[]>;
  openBranchRootId: number | null;
  registerMessageRef?: (id: number, el: HTMLDivElement | null) => void;
  onMainScroll?: React.UIEventHandler<HTMLDivElement>;
}

export default function MessageList({
  messages,
  onSelectMessage,
  onOpenBranch,
  childrenMap,
  onBranchToggle,
  openBranchRootId,
  registerMessageRef,
}: Props) {
  return (
    <div style={styles}>
      {messages.map((msg, index) => {
        const allChildren = childrenMap?.get(msg.id) || [];
        const nextMsg = messages[index + 1];
        const mainChild = nextMsg?.parent_msg_id === msg.id ? nextMsg : null;
        const branchChildren = allChildren.filter((child) => child.id !== mainChild?.id);

        return (
          <MessageBubble
            key={msg.id}
            msg={msg}
            onSelectMessage={onSelectMessage}
            onOpenBranch={onOpenBranch}
            onBranchToggle={onBranchToggle}
            branchChildren={branchChildren}
            isBranchOpen={openBranchRootId === msg.id}
            registerMessageRef={registerMessageRef}
          />
        );
      })}
    </div>
  );
}
