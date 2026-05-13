import React, { useEffect, useRef, useState } from "react";
import { getMessageLabel } from "../../api/messageHelpers";

const NODE_SIZE = 12;
const ROW_HEIGHT = 28;
const BRANCH_X_STEP = 24;
const BRANCH_Y_STEP = 22;
const FIRST_BRANCH_OFFSET = 24;

const MIN_SIDEBAR_WIDTH = 60;
const MAX_SIDEBAR_WIDTH = 420;
const DEFAULT_SIDEBAR_WIDTH = 180;

const styles = {
  sidebar: {
    position: "relative",
    width: `${DEFAULT_SIDEBAR_WIDTH}px`,
    minWidth: `${MIN_SIDEBAR_WIDTH}px`,
    maxWidth: `${MAX_SIDEBAR_WIDTH}px`,
    flexShrink: 0,
    background: "#252822",
    borderRight: "2px solid #4b5246",
    padding: "12px 10px",
    overflowY: "auto",
    overflowX: "hidden",
    boxSizing: "border-box",
  },

  resizeHandle: {
    position: "absolute",
    top: 0,
    right: 0,
    width: "6px",
    height: "100%",
    cursor: "col-resize",
    background: "transparent",
    zIndex: 20,
  },

  title: {
    fontSize: "12px",
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#a9b192",
    marginBottom: "12px",
  },

  empty: {
    color: "#a9b192",
    fontSize: "13px",
  },

  row: {
    position: "relative",
    minHeight: `${ROW_HEIGHT}px`,
  },

  mainNode: {
    position: "absolute",
    left: "0px",
    top: "0px",
    width: `${NODE_SIZE}px`,
    height: `${NODE_SIZE}px`,
    borderRadius: "999px",
    border: "2px solid #d8dcc8",
    background: "#252822",
    padding: 0,
    cursor: "pointer",
    zIndex: 2,
  },

  leftFocusedNode: {
    background: "#d8dcc8",
    scale: "1.25",
  },

  rightFocusedNode: {
    background: "#9fb39f",
    scale: "1.25",
    boxShadow: "0 0 0 3px rgba(159, 179, 159, 0.35)",
  },

  mainVertical: {
    position: "absolute",
    left: "5px",
    top: `${NODE_SIZE}px`,
    width: "2px",
    background: "#6a7261",
  },

  branchHorizontal: {
    position: "absolute",
    height: "2px",
    background: "#9fb39f",
  },

  branchVertical: {
    position: "absolute",
    width: "2px",
    background: "#9fb39f",
  },

  branchNode: {
    position: "absolute",
    width: `${NODE_SIZE}px`,
    height: `${NODE_SIZE}px`,
    borderRadius: "999px",
    border: "2px solid #9fb39f",
    background: "#252822",
    padding: 0,
    cursor: "pointer",
    zIndex: 2,
  },
};

function getFirstChildOfBranch(messages, clickedNodeId, branchPointId) {
  const fullPath = getPathToRoot(messages, clickedNodeId);

  const branchPointIndex = fullPath.findIndex(
    (msg) => msg.id === branchPointId
  );

  if (branchPointIndex === -1) return clickedNodeId;

  const firstChild = fullPath[branchPointIndex + 1];

  return firstChild?.id ?? clickedNodeId;
}

function findLatestVisibleLeaf(startId, childrenMap) {
  let currentId = startId;

  while (true) {
    const children = getChildren(childrenMap, currentId);

    const continuationChild = children.find(
      (child) => child.branch_from_message_id !== currentId
    );

    if (!continuationChild) {
      return currentId;
    }

    currentId = continuationChild.id;
  }
}

function getChildren(childrenMap, messageID) {
  return childrenMap.get(messageID) || [];
}

function getSubtreeHeight(node, childrenMap) {
  const children = getChildren(childrenMap, node.id);

  if (children.length === 0) {
    return BRANCH_Y_STEP;
  }

  let total = 0;

  for (const child of children) {
    total += getSubtreeHeight(child, childrenMap);
  }

  return Math.max(BRANCH_Y_STEP, total);
}

function getSubtreeWidth(node, childrenMap) {
    const children = getChildren(childrenMap, node.id);

    if (children.length === 0) {
        return BRANCH_X_STEP;
    }

    let maxWidth = BRANCH_X_STEP;
    
    for (const child of children) {
        const isExplicitBranch = child.branch_from_message_id === node.id;

        const childWidth = 
            isExplicitBranch
            ? BRANCH_X_STEP + getSubtreeWidth(child, childrenMap)
            : getSubtreeWidth(child, childrenMap);

        maxWidth = Math.max(maxWidth, childWidth);
    }

    return maxWidth;
}

function BranchSubtree({
  node,
  childrenMap,
  onBranchToggle,
  x,
  y,
  leftFocusedMessageId,
  rightFocusedMessageId,
  sourceLeafId,
  sourceBranchPointId,
  containingBranchPointId,
  rootBranchChildId,
}) {
  const children = getChildren(childrenMap, node.id);
  const isLeftFocused = node.id === leftFocusedMessageId;
  const isRightFocused = node.id === rightFocusedMessageId;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          const branchPointId =
            node.branch_from_message_id ?? node.parent_msg_id;

          onBranchToggle?.(
            containingBranchPointId,
            rootBranchChildId,
            sourceLeafId ?? node.id,
            sourceBranchPointId
          );
        }}
        style={{
          ...styles.branchNode,
          left: `${x}px`,
          top: `${y}px`,
          ...(isLeftFocused ? styles.leftFocusedNode : {}),
          ...(isRightFocused ? styles.rightFocusedNode : {}),
        }}
        title={`${getMessageLabel(node)}`}
      />

      {children.map((child, index) => {
        const previousSiblings = children.slice(0, index);

        let priorHeight = 0;

        for (const sibling of previousSiblings) {
          priorHeight += getSubtreeHeight(sibling, childrenMap);
        }

        const isExplicitBranch = child.branch_from_message_id === node.id;

        const childX = isExplicitBranch ? x + BRANCH_X_STEP : x;
        const childY = isExplicitBranch
          ? y
          : y + BRANCH_Y_STEP + priorHeight;

        const parentCenterX = x + NODE_SIZE / 2;
        const parentCenterY = y + NODE_SIZE / 2;

        const childCenterX = childX + NODE_SIZE / 2;
        const childCenterY = childY + NODE_SIZE / 2;

        return (
          <React.Fragment key={child.id}>
            {isExplicitBranch ? (
              <div
                style={{
                  ...styles.branchHorizontal,
                  left: `${parentCenterX}px`,
                  top: `${parentCenterY}px`,
                  width: `${childCenterX - parentCenterX}px`,
                }}
              />
            ) : (
              <div
                style={{
                  ...styles.branchVertical,
                  left: `${parentCenterX}px`,
                  top: `${parentCenterY}px`,
                  height: `${childCenterY - parentCenterY}px`,
                }}
              />
            )}

          <BranchSubtree
              node={child}
              childrenMap={childrenMap}
              onBranchToggle={onBranchToggle}
              x={childX}
              y={childY}
              leftFocusedMessageId={leftFocusedMessageId}
              rightFocusedMessageId={rightFocusedMessageId}
              sourceLeafId={
                isExplicitBranch
                  ? findLatestVisibleLeaf(node.id, childrenMap)
                  : sourceLeafId
              }
              sourceBranchPointId={
                isExplicitBranch
                  ? containingBranchPointId
                  : sourceBranchPointId
              }
              containingBranchPointId={
                isExplicitBranch
                  ? node.id
                  : containingBranchPointId
              }
              rootBranchChildId={
                isExplicitBranch
                  ? child.id
                  : rootBranchChildId
              }
            />
          </React.Fragment>
        );
      })}
    </>
  );
}

export default function TreeSidebar({
  mainPath = [],
  childrenMap = new Map(),
  leftFocusedMessageId = null,
  rightFocusedMessageId = null,
  activeLastLeafId = null,
  onJumpToMessage,
  onBranchToggle,
}) {
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const isResizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(DEFAULT_SIDEBAR_WIDTH);

  useEffect(() => {
    function handleMouseMove(e) {
      if (!isResizingRef.current) return;

      const deltaX = e.clientX - startXRef.current;

      const nextWidth = Math.min(
        Math.max(startWidthRef.current + deltaX, MIN_SIDEBAR_WIDTH),
        MAX_SIDEBAR_WIDTH
      );

      setSidebarWidth(nextWidth);
    }

    function handleMouseUp() {
      isResizingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  function handleResizeStart(e) {
    e.preventDefault();

    isResizingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = sidebarWidth;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  const sidebarStyle = {
    ...styles.sidebar,
    width: `${sidebarWidth}px`,
    minWidth: `${sidebarWidth}px`,
  };

  if (!mainPath.length) {
    return (
      <aside style={sidebarStyle}>
        <div style={styles.title}>Tree</div>
        <div style={styles.empty}>No leaves yet...</div>

        <div style={styles.resizeHandle} onMouseDown={handleResizeStart} />
      </aside>
    );
  }

  return (
    <aside style={sidebarStyle}>
      <div style={styles.title}>Tree</div>

      {mainPath.map((msg, index) => {
        const nextMsg = mainPath[index + 1];
        const children = getChildren(childrenMap, msg.id);

        const mainBranchChildId =
          nextMsg?.parent_msg_id === msg.id ? nextMsg.id : null;

        const branchChildren = children.filter(
          (child) => child.id !== mainBranchChildId
        );

        const isLeftFocused = msg.id === leftFocusedMessageId;
        const isRightFocused = msg.id === rightFocusedMessageId;
        const hasNext = index < mainPath.length - 1;

        const deepestBranchHeight = branchChildren.reduce((maxHeight, child) => {
          return Math.max(maxHeight, getSubtreeHeight(child, childrenMap));
        }, 0);

        const rowHeight =
          branchChildren.length > 0
            ? ROW_HEIGHT + deepestBranchHeight + BRANCH_Y_STEP
            : ROW_HEIGHT;

        return (
          <div
            key={msg.id}
            style={{
              ...styles.row,
              minHeight: `${rowHeight}px`,
            }}
          >
            <button
              type="button"
              onClick={() => onJumpToMessage?.(msg.id, "single")}
              style={{
                ...styles.mainNode,
                ...(isLeftFocused ? styles.leftFocusedNode : {}),
                ...(isRightFocused ? styles.rightFocusedNode : {}),
              }}
              title={`${getMessageLabel(msg)}`}
            />

            {hasNext && (
              <div
                style={{
                  ...styles.mainVertical,
                  height: `${rowHeight - NODE_SIZE}px`,
                }}
              />
            )}

            {branchChildren.map((child, branchIndex) => {
              let priorWidth = 0;
              for (const sibling of branchChildren.slice(0, branchIndex)) {
                  priorWidth += getSubtreeWidth(sibling, childrenMap);
              }
              const branchX = FIRST_BRANCH_OFFSET + priorWidth;
              const branchY = 0;

              const parentCenterX = NODE_SIZE / 2;
              const parentCenterY = NODE_SIZE / 2;
              const childCenterX = branchX + NODE_SIZE / 2;

              return (
                <React.Fragment key={child.id}>
                  <div
                    style={{
                      ...styles.branchHorizontal,
                      left: `${parentCenterX}px`,
                      top: `${parentCenterY}px`,
                      width: `${childCenterX - parentCenterX}px`,
                    }}
                  />

                  <BranchSubtree
                    node={child}
                    childrenMap={childrenMap}
                    onBranchToggle={onBranchToggle}
                    x={branchX}
                    y={branchY}
                    leftFocusedMessageId={leftFocusedMessageId}
                    rightFocusedMessageId={rightFocusedMessageId}
                  
                    sourceLeafId={activeLastLeafId}
                    sourceBranchPointId={null}
                  
                    containingBranchPointId={msg.id}
                    rootBranchChildId={child.id}
                  />
                </React.Fragment>
              );
            })}
          </div>
        );
      })}

      <div style={styles.resizeHandle} onMouseDown={handleResizeStart} />
    </aside>
  );
}
