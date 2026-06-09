import React from "react";
import { getMessageLabel } from "../../api/messageHelpers";
import type { Message, BranchPanel } from "../../types";

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "8px 16px",
    fontSize: "12px",
    color: "#a9b192",
    borderBottom: "1px solid #3e4d44",
    whiteSpace: "nowrap",
    overflowX: "auto",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  crumb: { color: "#f5f5dc" },
  separator: { color: "#6e7a6e" },
};

interface Props {
  branchPanel: BranchPanel | null;
  messages?: Message[];
}

export default function Breadcrumb({ branchPanel, messages = [] }: Props) {
  const branchTrail = buildBranchTrail(branchPanel, messages);

  return (
    <div style={styles.container}>
      <span style={styles.crumb}>Main</span>

      {branchTrail.map((branch) => (
        <React.Fragment key={branch.id}>
          <span style={styles.separator}>→</span>
          <span style={styles.crumb}>{branch.label}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

function buildBranchTrail(branchPanel: BranchPanel | null, messages: Message[]): { id: number; label: string }[] {
  if (!branchPanel) return [];

  const byId = new Map(messages.map((msg) => [msg.id, msg]));
  const trail: { id: number; label: string }[] = [];

  let current: Message | undefined = byId.get(branchPanel.branchPointId);

  while (current) {
    trail.unshift({ id: current.id, label: getMessageLabel(current) });

    let walker: Message | undefined = current.parent_msg_id ? byId.get(current.parent_msg_id) : undefined;
    let parentBranchPoint: Message | undefined = undefined;

    while (walker) {
      if (walker.branch_from_message_id) {
        parentBranchPoint = byId.get(walker.branch_from_message_id);
        break;
      }
      walker = walker.parent_msg_id ? byId.get(walker.parent_msg_id) : undefined;
    }

    current = parentBranchPoint;
  }

  return trail;
}
