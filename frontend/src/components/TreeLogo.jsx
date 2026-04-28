import React, { useMemo } from "react";

const SHELL_WIDTH = 280;
const SHELL_HEIGHT = 300;

const NODE_SIZE = 12;
const MAIN_COUNT = 5;

const MAIN_Y_STEP = 34;
const BRANCH_X_STEP = 34;
const BRANCH_Y_STEP = 28;

const MAX_BRANCH_DEPTH = 3;
const BRANCH_CHANCE = 0.7;

const MAX_NESTED_BRANCH_DEPTH = 2;
const NESTED_BRANCH_CHANCE = 0.45;

const styles = {
  shell: {
    width: `${SHELL_WIDTH}px`,
    height: `${SHELL_HEIGHT}px`,
    background: "transparent",
    border: "none",
    padding: 0,
    position: "relative",
    overflow: "hidden",
    boxShadow: "none",
  },

  canvas: {
    position: "relative",
    width: "100%",
    height: "100%",
  },

  node: {
    position: "absolute",
    width: `${NODE_SIZE}px`,
    height: `${NODE_SIZE}px`,
    borderRadius: "999px",
    border: "2px solid #d8dcc8",
    background: "#252822",
    zIndex: 2,
  },

  branchNode: {
    border: "2px solid #9fb39f",
  },

  activeNode: {
    background: "#9fb39f",
    transform: "scale(1.25)",
    boxShadow: "0 0 0 3px rgba(159, 179, 159, 0.35)",
  },

  verticalLine: {
    position: "absolute",
    width: "2px",
    background: "#6a7261",
    zIndex: 1,
  },

  horizontalLine: {
    position: "absolute",
    height: "2px",
    background: "#9fb39f",
    zIndex: 1,
  },
};

function randomFrom(seed) {
  let value = seed;

  return function random() {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

function makeFakeMessages(seed) {
  const random = randomFrom(seed);
  const messages = [];
  let id = 1;

  function addBranchChain(parent, nestingLevel = 0) {
    const branchRoot = {
      id: id++,
      parent_msg_id: parent.id,
      branch_from_message_id: parent.id,
      type: "branch",
    };

    messages.push(branchRoot);

    let branchParent = branchRoot;
    const depth = 1 + Math.floor(random() * MAX_BRANCH_DEPTH);

    for (let d = 0; d < depth; d++) {
      const branchMsg = {
        id: id++,
        parent_msg_id: branchParent.id,
        branch_from_message_id: null,
        type: "branch",
      };

      messages.push(branchMsg);

      if (
        nestingLevel < MAX_NESTED_BRANCH_DEPTH &&
        random() < NESTED_BRANCH_CHANCE
      ) {
        addBranchChain(branchMsg, nestingLevel + 1);
      }

      branchParent = branchMsg;
    }
  }

  const root = {
    id: id++,
    parent_msg_id: null,
    branch_from_message_id: null,
    type: "main",
  };

  messages.push(root);

  let currentMain = root;

  for (let i = 1; i < MAIN_COUNT; i++) {
    const mainMsg = {
      id: id++,
      parent_msg_id: currentMain.id,
      branch_from_message_id: null,
      type: "main",
    };

    messages.push(mainMsg);

    const canBranch = i < MAIN_COUNT - 1;
    const shouldBranch = canBranch && random() < BRANCH_CHANCE;

    if (shouldBranch) {
      addBranchChain(currentMain, 0);
    }

    currentMain = mainMsg;
  }

  return messages;
}

function buildChildrenMap(messages) {
  const map = new Map();

  for (const msg of messages) {
    const parentId = msg.parent_msg_id;

    if (!map.has(parentId)) {
      map.set(parentId, []);
    }

    map.get(parentId).push(msg);
  }

  return map;
}

function getChildren(childrenMap, messageId) {
  return childrenMap.get(messageId) || [];
}

function isExplicitBranch(parent, child) {
  return child.branch_from_message_id === parent.id;
}

function getSubtreeHeight(node, childrenMap) {
  const children = getChildren(childrenMap, node.id);

  if (children.length === 0) {
    return BRANCH_Y_STEP;
  }

  const branchChildren = children.filter((child) =>
    isExplicitBranch(node, child)
  );

  const continuationChildren = children.filter(
    (child) => !isExplicitBranch(node, child)
  );

  let branchHeight = 0;

  for (const child of branchChildren) {
    branchHeight += getSubtreeHeight(child, childrenMap);
  }

  let continuationHeight = 0;

  for (const child of continuationChildren) {
    continuationHeight += getSubtreeHeight(child, childrenMap);
  }

  return Math.max(
    BRANCH_Y_STEP,
    branchHeight + MAIN_Y_STEP + continuationHeight
  );
}

function layoutTreeFromMessages(messages) {
  const childrenMap = buildChildrenMap(messages);
  const nodes = [];
  const lines = [];

  function addLine(parentX, parentY, childX, childY, isBranch) {
    const parentCenterX = parentX + NODE_SIZE / 2;
    const parentCenterY = parentY + NODE_SIZE / 2;
    const childCenterX = childX + NODE_SIZE / 2;
    const childCenterY = childY + NODE_SIZE / 2;

    lines.push({
      id: `line-${lines.length}`,
      x1: parentCenterX,
      y1: parentCenterY,
      x2: childCenterX,
      y2: childCenterY,
      isBranch,
    });
  }

  function layoutNode(node, x, y) {
    nodes.push({
      id: node.id,
      x,
      y,
      type: node.type,
    });

    const children = getChildren(childrenMap, node.id);

    const branchChildren = children.filter((child) =>
      isExplicitBranch(node, child)
    );

    const continuationChildren = children.filter(
      (child) => !isExplicitBranch(node, child)
    );

    let branchStackHeight = 0;

    for (const child of branchChildren) {
      const childX = x + BRANCH_X_STEP;
      const childY = y + branchStackHeight;

      addLine(x, y, childX, childY, true);
      layoutNode(child, childX, childY);

      branchStackHeight += getSubtreeHeight(child, childrenMap);
    }

    let continuationY =
      y + Math.max(MAIN_Y_STEP, branchStackHeight + MAIN_Y_STEP);

    for (const child of continuationChildren) {
      const childX = x;
      const childY = continuationY;

      addLine(x, y, childX, childY, false);
      layoutNode(child, childX, childY);

      continuationY += getSubtreeHeight(child, childrenMap);
    }
  }

  const root = getChildren(childrenMap, null)[0];

  if (root) {
    layoutNode(root, 0, 0);
  }

  return { nodes, lines };
}

function centerTree(tree, shellWidth, shellHeight) {
  const allXs = [];
  const allYs = [];

  for (const node of tree.nodes) {
    allXs.push(node.x, node.x + NODE_SIZE);
    allYs.push(node.y, node.y + NODE_SIZE);
  }

  for (const line of tree.lines) {
    allXs.push(line.x1, line.x2);
    allYs.push(line.y1, line.y2);
  }

  const minX = Math.min(...allXs);
  const maxX = Math.max(...allXs);
  const minY = Math.min(...allYs);
  const maxY = Math.max(...allYs);

  const treeWidth = maxX - minX;
  const treeHeight = maxY - minY;

  const offsetX = shellWidth / 2 - (minX + treeWidth / 2);
  const offsetY = shellHeight / 2 - (minY + treeHeight / 2);

  return {
    nodes: tree.nodes.map((node) => ({
      ...node,
      x: node.x + offsetX,
      y: node.y + offsetY,
    })),

    lines: tree.lines.map((line) => ({
      ...line,
      x1: line.x1 + offsetX,
      y1: line.y1 + offsetY,
      x2: line.x2 + offsetX,
      y2: line.y2 + offsetY,
    })),
  };
}

export default function TreeLogo() {
  const seed = useMemo(() => Math.floor(Math.random() * 100000), []);

  const tree = useMemo(() => {
    const messages = makeFakeMessages(seed);
    const generatedTree = layoutTreeFromMessages(messages);

    return centerTree(generatedTree, SHELL_WIDTH, SHELL_HEIGHT);
  }, [seed]);

  return (
    <div style={styles.shell}>
      <div style={styles.canvas}>
        {tree.lines.map((line) => {
          const isVertical = line.x1 === line.x2;

          if (isVertical) {
            return (
              <div
                key={line.id}
                style={{
                  ...styles.verticalLine,
                  left: `${line.x1 - 1}px`,
                  top: `${Math.min(line.y1, line.y2)}px`,
                  height: `${Math.abs(line.y2 - line.y1)}px`,
                  background: line.isBranch ? "#9fb39f" : "#6a7261",
                }}
              />
            );
          }

          return (
            <div
              key={line.id}
              style={{
                ...styles.horizontalLine,
                left: `${Math.min(line.x1, line.x2)}px`,
                top: `${line.y1 - 1}px`,
                width: `${Math.abs(line.x2 - line.x1)}px`,
                background: line.isBranch ? "#9fb39f" : "#6a7261",
              }}
            />
          );
        })}

        {tree.nodes.map((node, index) => (
          <div
            key={node.id}
            style={{
              ...styles.node,
              ...(node.type === "branch" ? styles.branchNode : {}),
              ...(index === 2 ? styles.activeNode : {}),
              left: `${node.x}px`,
              top: `${node.y}px`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
