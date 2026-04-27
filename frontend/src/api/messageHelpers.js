// messages/messageHelpers.js
export function getMessageLabel(msg) {
  if (!msg?.content) return "Message";

  const clean = msg.content
    .replace(/\n/g, " ")
    .replace(/[#>*`]/g, "")
    .trim();

  return clean.length <= 30 ? clean : clean.slice(0, 30) + "...";
}
