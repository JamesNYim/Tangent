import { api } from "./client";

export async function register(email, username, password) {
    return api("/auth/register", {
        method: "POST",
        body: JSON.stringify({email, username, password}),
    });
}

export async function login(username, password) {
    return api("/auth/login", {
        method: "POST",
        body: JSON.stringify({username, password}),
    });
}

export async function getMe() {
    return api("/auth/me", {
        method: "GET",
    });
}

export function saveToken(token) {
    localStorage.setItem("access_token", token);
}

export function clearToken() {
    localStorage.removeItem("access_token");
}

export function getToken() {
    return localStorage.getItem("access_token");
}
