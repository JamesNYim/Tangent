import { useRef } from "react";

const styles = {
  form: {
    display: "flex",
    gap: "8px",
    padding: "16px",
    alignItems: "flex-end", // stops button from stretching
  },
  input: {
    flex: 1,
    padding: "8px 12px",
    background: "#33352c",
    border: "3px solid #f5f5dc",
    borderRadius: "25px",
    outline: "none",
    minHeight: "40px",
    maxHeight: "150px",
    lineHeight: "20px",
    resize: "none",
    overflowY: "auto",
    boxSizing: "border-box",
    fontFamily: "inherit",   // 👈 key fix
    fontSize: "14px",        // match your UI
    color: "inherit",
  },
  button: {
    height: "40px", // fixed button height
    alignSelf: "flex-end",
  },
};

export default function MessageInput({
  input,
  setInput,
  onSendMessage,
  disabled,
  sending,
}) {
  const textareaRef = useRef(null);

  function resizeTextarea(el) {
    el.style.height = "40px";
    el.style.height = Math.min(el.scrollHeight, 150) + "px";
  }

  function resetTextarea() {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "40px";
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSendMessage(e);
      resetTextarea();
    }
  }

  function handleSubmit(e) {
    onSendMessage(e);
    resetTextarea();
  }

  function handleChange(e) {
    setInput(e.target.value);
    resizeTextarea(e.target);
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <textarea
        ref={textareaRef}
        rows={1}
        placeholder="Type your message..."
        value={input}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        style={styles.input}
      />

      <button type="submit" disabled={disabled} style={styles.button}>
        {sending ? "Sending..." : "Send"}
      </button>
    </form>
  );
}
