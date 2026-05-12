import { api } from "./client";

export async function saveAPIKey(provider, apiKey) {
    const res = api("/api-keys", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
            provider,
            api_key: apiKey,
        }),
    });

    if (!res.ok) {
        const error = await res.json.catch(()=>null);
        throw new Error(error?.detail || "Failed to save API Key");
    }

    return res.json();
}
