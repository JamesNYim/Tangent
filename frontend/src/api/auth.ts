import { api } from "./client";
import type { User } from "../types";

export async function register(email: string, username: string, password: string): Promise<unknown> {
    return api("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, username, password }),
    });
}

export async function login(username: string, password: string): Promise<{ access_token: string }> {
    return api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
    }) as Promise<{ access_token: string }>;
}

export async function getMe(): Promise<User> {
    return api("/auth/me", { method: "GET" }) as Promise<User>;
}

export function saveToken(token: string): void {
    localStorage.setItem("access_token", token);
}

export function clearToken(): void {
    localStorage.removeItem("access_token");
}

export function getToken(): string | null {
    return localStorage.getItem("access_token");
}
