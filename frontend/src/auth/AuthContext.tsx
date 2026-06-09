import React, { createContext, useContext, useEffect, useState } from "react";
import { clearToken, getToken, saveToken, getMe } from "../api/auth";
import type { User } from "../types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  logout: () => void;
  setSessionFromToken: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    async function bootAuth() {
        const token = getToken();

        if (!token) {
            setUser(null);
            setLoading(false);
            return;
        }

        try {
            const me = await getMe();
            setUser(me);
        } catch {
            clearToken();
            setUser(null);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        bootAuth();
    }, []);

    async function setSessionFromToken(token: string) {
        saveToken(token);
        const me = await getMe();
        setUser(me);
    }

    function logout() {
        clearToken();
        setUser(null);
    }

    const val: AuthContextValue = { user, loading, logout, setSessionFromToken };

    return (
        <AuthContext.Provider value={val}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
