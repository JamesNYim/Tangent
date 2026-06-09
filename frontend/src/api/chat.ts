import { api } from "./client";
import type { Conversation, Message, SendMessageResponse } from "../types";

export async function createConversation(title = "New Chat"): Promise<Conversation> {
    return api("/conversations", {
        method: "POST",
        body: JSON.stringify({ title }),
    }) as Promise<Conversation>;
}

export async function getConversations(): Promise<Conversation[]> {
    return api("/conversations", { method: "GET" }) as Promise<Conversation[]>;
}

export async function getConversation(conversationID: number): Promise<Conversation> {
    return api(`/conversations/${conversationID}`) as Promise<Conversation>;
}

export async function getMessages(conversationID: number): Promise<Message[]> {
    return api(`/conversations/${conversationID}/messages`) as Promise<Message[]>;
}

export async function sendMessage(
    conversationID: number,
    content: string,
    parentMsgID: number | null
): Promise<SendMessageResponse> {
    return api(`/conversations/${conversationID}/messages`, {
        method: "POST",
        body: JSON.stringify({ content, parent_msg_id: parentMsgID }),
    }) as Promise<SendMessageResponse>;
}

export async function renameConversation(conversationID: number, newTitle: string): Promise<Conversation> {
    return api(`/conversations/${conversationID}`, {
        method: "PATCH",
        body: JSON.stringify({ title: newTitle }),
    }) as Promise<Conversation>;
}

export async function deleteConversation(conversationID: number): Promise<void> {
    await api(`/conversations/${conversationID}`, { method: "DELETE" });
}
