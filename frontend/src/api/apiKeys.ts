import { api } from "./client";

export async function saveAPIKey(provider: string, apiKey: string): Promise<unknown> {
    return api("/api-keys", {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ provider, api_key: apiKey }),
    });
}
