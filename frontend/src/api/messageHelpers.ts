import type { Message } from "../types";

export function getMessageLabel(msg: Message | null | undefined): string {
  if (!msg?.content) return "Message";

  const clean = msg.content
    .replace(/\n/g, " ")
    .replace(/[#>*`]/g, "")
    .trim();

  return clean.length <= 30 ? clean : clean.slice(0, 30) + "...";
}
