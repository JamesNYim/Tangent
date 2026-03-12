import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/auth";
import { useAuth } from "../auth/AuthContext";

import RegisterButton from "../components/RegisterButton";

export default function LoginPage() {
    const nav = useNavigate();
    const { setSessionFromToken } = useAuth();

    const [ username, setUsername ] = useState("");
    const [ password, setPassword ] = useState("");
    const [err, setErr] = useState("");

    async function onSubmit(e) {
        e.preventDefault();
        setErr("");

        try {
            const data = await login(username, password);
            const token = data.access_token;
            if (!token) {
                throw new Error("No token returned from login");
            }

            await setSessionFromToken(token);
            nav("/");
        }
        catch (error) {
            setErr(error.message);
        }
    }

    return (
            <div style={{ maxWidth: 420, margin: "40px auto" }}>
          <h2>Login</h2>
          <form onSubmit={onSubmit}>
            <label>Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ width: "100%", marginBottom: 12 }}
            />

            <label>Password</label>
            <input
              value={password}
              type="password"
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", marginBottom: 12 }}
            />

            {err && <p style={{ color: "red" }}>{err}</p>}

            <button type="submit">Login</button>
          </form>
          <RegisterButton />
        </div>
    );

}
