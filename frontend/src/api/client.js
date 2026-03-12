const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";


// ADR-001: Generic API wrapper (see docs/architecture/001-api-client.md)
export async function api(path, options = {}) {
    const url = `${API_BASE}${path}`;

    // Set headers
    const headers = new Headers(options.headers || {});
    headers.set("Content-Type", "application/json");

    // Set token
    const token = localStorage.getItem("access_token");
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }
    else {
        console.log("Frontend couldnt find token");
    }

    // Make a request
    const res = await fetch (
        url, 
        {
            ...options,
            headers,
        }
    );

    // Parse response
    const contentType = res.headers.get("Content-Type") || "";
    const isJson = contentType.includes("application/json");

    let data;
    if (isJson) {
        data = await res.json().catch(() => null);
    }
    else {
        data = await res.text();
    } 

    // If error
    if (!res.ok) {
        const message = 
            (data && data.detail) ||
            (typeof data === "string" && data) ||
            `Request failed w/ status: ${res.status}`;
        
        const err = new Error(message);
        err.status = res.status;
        err.data = data;
        throw err;
    }
    return data;
}
