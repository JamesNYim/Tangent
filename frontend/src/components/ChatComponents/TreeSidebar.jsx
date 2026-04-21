const NODE_SIZE = 12;
const FIRST_BRANCH_OFFSET = 12;
const ROW_HEIGHT = 28;
const BRANCH_GAP = 24;

const styles = {
  sidebar: {
    width: "160px",
    minWidth: "160px",
    background: "#252822",
    borderRight: "1px solid #4b5246",
    padding: "12px 10px",
    overflowY: "auto",
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
    background: "transparent",
    padding: 0,
    cursor: "pointer",
  },
  activeNode: {
    background: "#d8dcc8",
  },
  focusedNode: {
    boxShadow: "0 0 0 3px rgba(216, 220, 200, 0.25)",
  },
  mainVertical: {
    position: "absolute",
    left: "5px",
    top: `${NODE_SIZE}px`,
    width: "2px",
    height: `${ROW_HEIGHT - NODE_SIZE + 4}px`,
    background: "#6a7261",
  },
  branchHorizontal: {
    position: "absolute",
    left: `${NODE_SIZE}px`,
    top: "5px",
    height: "2px",
    background: "#9fb39f",
  },
  branchNode: {
    position: "absolute",
    top: "0px",
    width: `${NODE_SIZE}px`,
    height: `${NODE_SIZE}px`,
    borderRadius: "999px",
    border: "2px solid #9fb39f",
    background: "transparent",
    padding: 0,
    cursor: "pointer",
  },
  nestedVertical: {
    position: "absolute",
    top: `${NODE_SIZE}px`,
    width: "2px",
    height: `${ROW_HEIGHT - NODE_SIZE}px`,
    background: "#9fb39f",
  },
  nestedNode: {
    position: "absolute",
    top: `${ROW_HEIGHT}px`,
    width: `${NODE_SIZE}px`,
    height: `${NODE_SIZE}px`,
    borderRadius: "999px",
    border: "2px solid #9fb39f",
    background: "transparent",
    padding: 0,
    cursor: "pointer",
  },
};

export default function TreeSidebar({
    mainPath = [],
    childrenMap = {},
    focusedMessageId = null,
    activeLastLeafId = null,
    onJumpToMessage,
    onOpenBranch
}) {
    if (!mainPath.length) {
        return (
            <aside style={styles.sidebar}>
                <div style={styles.title}>Tree</div>
                <div style={styles.empty}>No leaves yet...</div>
            </aside>
        );
    }
    return (
        <div style={styles.sidebar}>
            <div style={styles.title}>Tree</div>
            {mainPath.map((msg, index) => {
                const nextMsg = mainPath[index + 1];
                const children = childrenMap.get(msg.id) || [];

                const mainBranchChildId = nextMsg?.parent_msg_id === msg.id ? nextMsg.id : null;
                const branchChildren = children.filter((child) => child.id !== mainBranchChildId);

                const isFocused = msg.id === focusedMessageId;
                const isActive = msg.id === activeLastLeafId;
                const hasNext = index < mainPath.length - 1;

                const rowHeight = branchChildren.length > 0 ? ROW_HEIGHT + 24 : ROW_HEIGHT;

                return (
                    <div key={msg.id} style={{...styles.row, minHeight: `${rowHeight}px`}}>
                        <div>
                            <button
                                type="button"
                                onClick={() => onJumpToMessage?.(msg.id)}
                                style={{
                                    ...styles.mainNode,
                                    ...(isActive ? styles.activeNode : {}),
                                    ...(isFocused ? styles.focusedNode : {})
                                }}
                                title={`Jump to message ${msg.id}`}
                            />
                            {hasNext && <div style={styles.mainVertical}/>}
                            {branchChildren.length > 0 && (
                                <>
                                    <div style= {{...styles.branchHorizontal, width: `${(branchChildren.length - 1) * BRANCH_GAP + NODE_SIZE}px`}} />
                                    {branchChildren.map((child, branchIndex) => {
                                        const leftOffset =  FIRST_BRANCH_OFFSET + NODE_SIZE + branchIndex * BRANCH_GAP;
                                        const nestedChildren = childrenMap.get(child.id) || [];
                                        const hasNested = nestedChildren.length > 0;

                                        return (
                                            <div key={child.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => {onOpenBranch?.(msg, child.id)}}
                                                    style={{...styles.branchNode, left: `${leftOffset}px`}}
                                                    title={`Open branch ${child.id}`}
                                                />
                                                {hasNested && (
                                                    <>
                                                        <div style= {{...styles.nestedVertical, left: `${leftOffset + 5}px`}}/>
                                                        <button
                                                            type="button"
                                                            onClick={() => onOpenBranch?.(child, nestedChildren[0].id)}
                                                            style={{...styles.nestedNode, left: `${leftOffset}px`}}
                                                            title={`Open nested branch ${child.id}`}
                                                        />
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
