import React from "react";
import { getMessageLabel } from "../../api/messageHelpers";

const styles = {
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

  crumb: {
    color: "#f5f5dc",
  },

  separator: {
    color: "#6e7a6e",
  },
};

export default function Breadcrumb({ branchPanel, messages = [] }) {
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

function buildBranchTrail(branchPanel, messages) {
  if (!branchPanel) return [];

  const byId = new Map(messages.map((msg) => [msg.id, msg]));
  const trail = [];

  let current = byId.get(branchPanel.branchPointId);

  while (current) {
    trail.unshift({
      id: current.id,
      label: getMessageLabel(current),
    });

    let walker = byId.get(current.parent_msg_id);
    let parentBranchPoint = null;

    while (walker) {
      if (walker.branch_from_message_id) {
        parentBranchPoint = byId.get(walker.branch_from_message_id);
        break;
      }

      walker = byId.get(walker.parent_msg_id);
    }

    current = parentBranchPoint;
  }

  return trail;
}
