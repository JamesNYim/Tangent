import React, { createContext, useContext, useEffect, useState } from "react";
import { clearToken, getToken, saveToken } from "../api/auth";
import { getMe } from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    async function bootAuth() {
        const token = getToken();

        if (!token) {
            setUser(null);
            setLoading(false);
            return;

        }

        try {
            const me = await getMe()
            setUser(me);
        }
        catch (err) {
            clearToken();
            setUser(null);
        }
        finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        bootAuth();
    }, []);

    async function setSessionFromToken(token) {
        saveToken(token);
        const me = await getMe();
        setUser(me);
    }

    function logout() {
        clearToken();
        setUser(null);
    }

    const val = { user, loading, logout, setSessionFromToken };

    return (
        <AuthContext.Provider value={val}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
