const styles = {
  sidebar: {
    width: "220px",
    minWidth: "220px",
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
  row: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    paddingBottom: "14px",
  },
  treeCol: {
    width: "22px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    flexShrink: 0,
  },
  nodeButton: {
    width: "12px",
    height: "12px",
    borderRadius: "999px",
    border: "2px solid #d8dcc8",
    background: "transparent",
    cursor: "pointer",
    padding: 0,
  },
  activeNode: {
    background: "#d8dcc8",
  },
  focusedNode: {
    boxShadow: "0 0 0 3px rgba(216, 220, 200, 0.25)",
  },
  verticalLine: {
    width: "2px",
    minHeight: "28px",
    background: "#6a7261",
    marginTop: "4px",
    flex: 1,
  },
  contentCol: {
    flex: 1,
    minWidth: 0,
  },
  labelButton: {
    background: "transparent",
    border: "none",
    color: "#f5f5d3",
    cursor: "pointer",
    padding: 0,
    fontSize: "13px",
    textAlign: "left",
  },
  focusedLabel: {
    fontWeight: "bold",
    color: "#ffffff",
  },
  branchList: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    marginTop: "6px",
  },
  branchButton: {
    background: "transparent",
    border: "none",
    color: "#9fb39f",
    cursor: "pointer",
    padding: 0,
    fontSize: "12px",
    textAlign: "left",
  },
  empty: {
    color: "#a9b192",
    fontSize: "13px",
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

                return (
                    <div key={msg.id} style={styles.row}>
                        <div style={styles.treeCol}>
                            <button
                                type="button"
                                onClick={() => onJumpToMessage?.(msg.id)}
                                style={{
                                    ...styles.nodeButton,
                                    ...(isActive ? styles.activeNode : {}),
                                    ...(isFocused ? styles.focusedNode : {})
                                }}
                                title={`Jump to message ${msg.id}`}
                            />
                            {hasNext && <div style={styles.verticalLine}/>}
                        </div>
                        <div style={styles.contentCol}>
                            <button
                                type="button"
                                onClick={() => onJumpToMessage?.(msg.id)}
                                style={{
                                    ...styles.labelButton,
                                    ...(isFocused ? styles.focusedLabel : {}),
                                }}
                            >
                            msg {msg.id}
                            </button>
                            {branchChildren.length > 0 && (
                                <div style={styles.branchList}>
                                    {branchChildren.map((child) => (
                                        <button 
                                            key={child.id}
                                            type="button"
                                            onClick= {() => onOpenBranch?.(msg, child.id)}
                                            style={styles.branchButton}
                                            title={`Open branch from msg ${msg.id}`}
                                        >
                                        └─ branch {child.id}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
