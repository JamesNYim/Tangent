import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { register } from "../api/auth";
import { useAuth } from "../auth/AuthContext";

import LoginButton from "../components/LoginButton";

export default function RegisterPage() {
    const nav = useNavigate();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [email, setEmail] = useState("");
    const [err, setErr] = useState("");

    async function onSubmit(e) {
        e.preventDefault();
        setErr("");

        try {
            const data = await register(email, username, password);
            console.log(data);
            nav("/login");

        }
        catch (error) {
            setErr(error.message);
        }
    }

    return (
        <div style={{ maxWidth: 420, margin: "40px auto" }}>
      <h2>Register</h2>
      <form onSubmit={onSubmit}>
        <label>Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", marginBottom: 12 }}
        />

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

        <button type="submit">Create account</button>
      </form>
      <LoginButton />
    </div>
    );
}

