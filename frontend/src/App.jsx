import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AuthProvider } from "./auth/AuthContext";
import RequireAuth from "./auth/RequireAuth";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import ChatPage from "./pages/ChatPage";

export default function App() {
  return (
    <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="*" element={<div>404</div>} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={
                <RequireAuth>
                    <ChatPage />
                </RequireAuth>
            }/>
          </Routes>
        </AuthProvider>
    </BrowserRouter>
  );
}


