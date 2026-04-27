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

  const trail = [];

  if (branchPanel.trunkBranchPointId) {
    const trunkBranchPoint = messages.find(
      (msg) => msg.id === branchPanel.trunkBranchPointId
    );

    if (trunkBranchPoint) {
      trail.push({
        id: `trunk-${trunkBranchPoint.id}`,
        label: `${getMessageLabel(trunkBranchPoint)}`,
      });
    }
  }

  const currentBranchPoint = messages.find(
    (msg) => msg.id === branchPanel.branchPointId
  );

  if (currentBranchPoint) {
    trail.push({
      id: `current-${currentBranchPoint.id}`,
      label:`${getMessageLabel(currentBranchPoint)}`,
    });
  }

  return trail;
}


