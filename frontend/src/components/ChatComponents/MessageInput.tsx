import { useRef } from "react";
import type { FormEvent } from "react";
import React from "react";

const styles: Record<string, React.CSSProperties> = {
  form: {
    display: "flex",
    gap: "8px",
    padding: "16px",
    alignItems: "flex-end",
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
    fontFamily: "inherit",
    fontSize: "14px",
    color: "inherit",
  },
  button: {
    height: "40px",
    alignSelf: "flex-end",
  },
};

interface Props {
  input: string;
  setInput: (value: string) => void;
  onSendMessage: (e: FormEvent) => void;
  disabled: boolean;
  sending: boolean;
}

export default function MessageInput({ input, setInput, onSendMessage, disabled, sending }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function resizeTextarea(el: HTMLTextAreaElement) {
    el.style.height = "40px";
    el.style.height = Math.min(el.scrollHeight, 150) + "px";
  }

  function resetTextarea() {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "40px";
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSendMessage(e as unknown as FormEvent);
      resetTextarea();
    }
  }

  function handleSubmit(e: FormEvent) {
    onSendMessage(e);
    resetTextarea();
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
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
