import React, { useState } from "react";
import { api } from "../services/api";

export function AuthPanel({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "teacher" });
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/signup";
      const { data } = await api.post(path, form);
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      onAuth(data.user);
    } catch (err) {
      setError(err.response?.data?.error || "Authentication failed");
    }
  }

  return (
    <main className="auth">
      <section className="authCard">
        <h1>CyberGuard</h1>
        <p>Real-time student safety platform with JWT auth, RBAC, MongoDB, and per-student ML.</p>
        <div className="segmented">
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Login</button>
          <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Signup</button>
        </div>
        <form onSubmit={submit}>
          {mode === "signup" && (
            <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          )}
          <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input placeholder="Password" type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          {mode === "signup" && (
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
              <option value="superadmin">Superadmin</option>
            </select>
          )}
          <button className="primary">{mode === "login" ? "Login" : "Create account"}</button>
        </form>
        {error && <div className="error">{error}</div>}
      </section>
    </main>
  );
}
