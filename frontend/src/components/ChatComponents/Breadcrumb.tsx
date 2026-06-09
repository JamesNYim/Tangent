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

function buildBranchTrail(
  branchPanel: BranchPanel | null,
  messages: Message[]
): { id: number; label: string }[] {
  if (!branchPanel) return [];

  const byId = new Map(messages.map((msg) => [msg.id, msg]));
  const trail: { id: number; label: string }[] = [];

  let anchorId: number | null = branchPanel.branchPointId;
  // searchFromId is the leaf of the active branch at this level;
  // we walk up from it to find the first message belonging to this branch.
  let searchFromId: number = branchPanel.branchLeafId;

  while (anchorId != null) {
    // Walk up from searchFromId to find the first message of this branch
    // (the one with branch_from_message_id === anchorId).
    let walker: Message | undefined = byId.get(searchFromId);
    let branchStart: Message | undefined = undefined;

    while (walker) {
      if (walker.branch_from_message_id === anchorId) {
        branchStart = walker;
        break;
      }
      walker = walker.parent_msg_id != null ? byId.get(walker.parent_msg_id) : undefined;
    }

    const labelMsg = branchStart ?? byId.get(anchorId);
    trail.unshift({ id: anchorId, label: getMessageLabel(labelMsg) });

    // Walk up from anchorId to find the parent branch's anchor.
    // The first message with branch_from_message_id set in this chain
    // is the start of the branch that contains anchorId.
    walker = byId.get(anchorId);
    let parentAnchorId: number | null = null;

    while (walker) {
      if (walker.branch_from_message_id != null) {
        parentAnchorId = walker.branch_from_message_id;
        // The branch start at this level becomes our search origin for the parent level.
        searchFromId = walker.id;
        break;
      }
      walker = walker.parent_msg_id != null ? byId.get(walker.parent_msg_id) : undefined;
    }

    anchorId = parentAnchorId;
  }

  return trail;
}
