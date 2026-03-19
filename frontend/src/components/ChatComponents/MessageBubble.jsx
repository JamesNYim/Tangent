const styles = {
  bubble: {
    maxWidth: "70%",
    padding: "12px",
    borderRadius: "10px",
  },
  userBubble: {
    alignSelf: "flex-end",
    background: "#33352c",
  },
  assistantBubble: {
    alignSelf: "flex-start",
    background: "#33352c",
  },
  role: {
    fontSize: "12px",
    fontWeight: "bold",
    marginBottom: "4px",
    textTransform: "capitalize",
  },
};

export default function MessageBubble({ msg, onSelectMessage }) {
  const bubbleStyle =
    msg.role === "user" ? styles.userBubble : styles.assistantBubble;

  return (
    <div
      onClick= {() =>  {
            onSelectMessage?.(msg.id);
            console.log("clicked msg: ", msg.id);
          }
      }
      style={{
        ...styles.bubble,
        ...bubbleStyle,
      }}
    >
      <div style={styles.role}>{msg.role}</div>
      <div>{msg.content}</div>
    </div>
  );
}
