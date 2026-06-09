const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

if (!API_BASE) {
    throw new Error("MISSING VITE_API_BASE_URL");
}

interface ApiError extends Error {
  status: number;
  data: unknown;
}

export async function api(path: string, options: RequestInit = {}): Promise<unknown> {
    const url = `${API_BASE}${path}`;

    const headers = new Headers(options.headers as HeadersInit | undefined);
    headers.set("Content-Type", "application/json");

    const token = localStorage.getItem("access_token");
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    const res = await fetch(url, { ...options, headers });

    const contentType = res.headers.get("Content-Type") || "";
    const isJson = contentType.includes("application/json");

    let data: unknown;
    if (isJson) {
        data = await res.json().catch(() => null);
    } else {
        data = await res.text();
    }

    if (!res.ok) {
        const detail = data && typeof data === "object" && "detail" in data
            ? (data as Record<string, unknown>).detail
            : null;
        const message =
            (typeof detail === "string" ? detail : null) ||
            (typeof data === "string" ? data : null) ||
            `Request failed w/ status: ${res.status}`;

        const err = new Error(message) as ApiError;
        err.status = res.status;
        err.data = data;
        throw err;
    }

    return data;
}
