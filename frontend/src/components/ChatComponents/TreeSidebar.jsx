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
                const children = childrenMap[msg.id] || [];

                const mainBranchChildId = nextMsg?.parent_msg_id === msg.id ? nextMsg.id : null;
                const branchChildren = children.filter((childId) => childId !== mainBranchChildId);

                const isFocused = msg.id === focusedMessageId;
                const isActive = msg.id === activeLastLeafId;
                const hasNext = index < activePath.length - 1;

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
                            {hasNext && <div styles={styles.verticalLine}/>}
                        </div>
                        <div styles={styles.contentCol}>
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
                                <div styles={styles.branchList}>
                                    {branchChildren.map((childId) => {
                                        <button 
                                            key={childId}
                                            type="button"
                                            onClick= {() => onOpenBranch?.(msg, childId)}
                                            style={styles.branchButton}
                                            title={`Open branch from msg ${msg.id}`}
                                        >
                                        └─ branch {childId}
                                        </button>
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
