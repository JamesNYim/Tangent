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

export async function sendMessage(conversationID, content, parentMsgID) {
    const res = await api(`/conversations/${conversationID}/messages`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ content, parent_msg_id: parentMsgID }),
    });

    return res
}

export async function renameConversation(conversationID, newTitle) {
    const res = await api(`/conversations/${conversationID}`, {
        method: "PATCH",
        body: JSON.stringify({ title: newTitle }),
    });

    return res
}

export async function deleteConversation(conversationID) {
    const res = await api(`/conversations/${conversationID}`, {
        method: "DELETE"
    });

    return res;
}
