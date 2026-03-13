import { api } from "./client"

export async function createConversation(title = "New Chat") {
    const res = api("/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
    });
    return res;
}

export async function getConversations() {
    const res = api("/conversations", {
        method: "GET"
    });
    return res;
}

export async function getConversation(conversationID) {
    const res = api(`/conversations/${conversationID}`);
    return res;
}

export async function getMessages(conversationID) {
    const res = api(`/conversations/${conversationID}/messages`);
    return res;
}

export async function sendMessage(conversationID, content) {
    const res = api(`/conversations/${conversationID}/messages`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ content }),
    });
}
