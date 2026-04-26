import React, { useEffect, useState } from "react";
import { AuthPanel } from "./components/AuthPanel";
import { api } from "./services/api";
import { createSocket } from "./services/socket";
import { TeacherDashboard } from "./teacher/TeacherDashboard";
import { AdminDashboard } from "./admin/AdminDashboard";
import { SuperadminDashboard } from "./superadmin/SuperadminDashboard";
import "./styles.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setLoading(false);
      return;
    }

    api.get("/auth/me")
      .then(({ data }) => setUser(data.user))
      .catch(() => localStorage.clear())
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    const socket = createSocket();
    socket.on("message-flagged", (message) => setAlerts((items) => [message, ...items].slice(0, 20)));
    socket.on("critical-alert", (message) => setAlerts((items) => [message, ...items].slice(0, 20)));
    return () => socket.disconnect();
  }, [user]);

  if (loading) return <main className="auth"><section className="authCard">Loading...</section></main>;
  if (!user) return <AuthPanel onAuth={setUser} />;

  return (
    <>
      <header className="topbar">
        <strong>CyberGuard</strong>
        <span>{user.name} · {user.role}</span>
        <button type="button" onClick={() => { localStorage.clear(); setUser(null); }}>Logout</button>
      </header>
      <main className="main">
        {user.role === "teacher" && <TeacherDashboard alerts={alerts} />}
        {user.role === "admin" && <AdminDashboard />}
        {user.role === "superadmin" && <SuperadminDashboard />}
      </main>
    </>
  );
}
