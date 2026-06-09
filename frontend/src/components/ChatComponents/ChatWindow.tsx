import React from "react";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import { getMessageLabel } from "../../api/messageHelpers";
import type { Message } from "../../types";
import type { FormEvent } from "react";

type Position = "single" | "left" | "right" | "middle";

function getBorderRadius(position: Position): string {
  switch (position) {
    case "left": return "15px 0 0 15px";
    case "right": return "0 15px 15px 0";
    case "middle": return "0";
    default: return "15px";
  }
}

function getBorder(position: Position): React.CSSProperties {
  const base = { borderTop: "2px solid #f5f5d3", borderBottom: "2px solid #f5f5d3" };
  switch (position) {
    case "left": return { ...base, borderLeft: "2px solid #f5f5d3", borderRight: "1px solid #f5f5d3" };
    case "right": return { ...base, borderLeft: "1px solid #f5f5d3", borderRight: "2px solid #f5f5d3" };
    case "middle": return { ...base, borderLeft: "none", borderRight: "none" };
    default: return { border: "2px solid #f5f5d3" };
  }
}

const styles = {
  main: (position: Position): React.CSSProperties => ({
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
  branchHeader: { padding: "12px" } as React.CSSProperties,
  branchMeta: { fontSize: "12px", opacity: 0.8, color: "#f5f5dc" } as React.CSSProperties,
  branchText: { fontSize: "13px", borderLeft: "3px solid #bb8954", paddingLeft: "8px", whiteSpace: "pre-wrap" } as React.CSSProperties,
  messagesArea: { display: "flex", flex: 1, minHeight: 0, padding: "16px", overflowY: "auto" } as React.CSSProperties,
  error: { color: "red" } as React.CSSProperties,
};

interface Props {
  position?: Position;
  error?: string;
  selectedConversationId: number | null;
  loadingMessages: boolean;
  messages: Message[];
  input: string;
  setInput: (value: string) => void;
  onSendMessage: (e: FormEvent) => void;
  sending: boolean;
  onSelectMessage?: (msg: Message) => void;
  onOpenBranch?: (msg: Message, selectedText: string | null, childId?: number | null) => void;
  onBranchToggle?: (messageId: number, childId: number) => void;
  openBranchId: number | null;
  branchPointId?: number | null;
  branchFromText?: string | null;
  childrenMap: Map<number | null, Message[]>;
  registerMessageRef?: (id: number, el: HTMLDivElement | null) => void;
  onMainScroll?: React.UIEventHandler<HTMLDivElement>;
  onJumpToMessage?: (id: number) => void;
  branchFromMessage?: Message | null;
}

export default function ChatWindow({
  position = "single",
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
  onBranchToggle,
  openBranchId,
  branchFromText = null,
  childrenMap,
  registerMessageRef,
  onMainScroll,
  branchFromMessage = null,
}: Props) {
  const inputDisabled = !selectedConversationId || sending;

  return (
    <main style={styles.main(position)}>
      <div style={styles.branchHeader}>
        <div style={styles.branchMeta}>
          {branchFromMessage ? `Branching from "${getMessageLabel(branchFromMessage)}"` : "Main Trunk"}
        </div>
        {branchFromText && (
          <div style={styles.branchText}>
            <strong>Selection:</strong> "{branchFromText}"
          </div>
        )}
      </div>

      <div style={styles.messagesArea} className="hide-scrollbar" onScroll={onMainScroll}>
        {error && <p style={styles.error}>{error}</p>}

        {selectedConversationId == null ? (
          <p>Select or create a conversation.</p>
        ) : loadingMessages ? (
          <p>Loading messages...</p>
        ) : messages.length === 0 ? (
          <div style={{ margin: "auto" }}>No messages yet...</div>
        ) : (
          <MessageList
            messages={messages}
            onSelectMessage={onSelectMessage ? (id) => onSelectMessage(messages.find((m) => m.id === id)!) : undefined}
            onOpenBranch={onOpenBranch}
            onBranchToggle={onBranchToggle}
            childrenMap={childrenMap}
            openBranchRootId={openBranchId}
            registerMessageRef={registerMessageRef}
          />
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
