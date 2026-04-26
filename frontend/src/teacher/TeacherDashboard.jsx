import React, { useEffect, useState } from "react";
import { AlertTriangle, Brain, Users } from "lucide-react";
import { api } from "../services/api";
import { AlertFeed } from "../components/AlertFeed";

export function TeacherDashboard({ alerts }) {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState([]);
  const [studentForm, setStudentForm] = useState({ studentId: "", name: "", grade: "", section: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [studentRes, messageRes] = await Promise.all([api.get("/students"), api.get("/messages")]);
      setStudents(studentRes.data.students);
      setMessages(messageRes.data.messages);
    } catch (err) {
      setError(err.response?.data?.error || "Could not load dashboard data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function analyze(event) {
    event.preventDefault();
    setError("");
    try {
      await api.post("/messages", { studentId: selectedStudent, messageText, platform: "chat" });
      setMessageText("");
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not analyze message");
    }
  }

  async function createStudent(event) {
    event.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/students", studentForm);
      setStudentForm({ studentId: "", name: "", grade: "", section: "" });
      setSelectedStudent(data.student._id);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not create student");
    }
  }

  return (
    <div className="dashboard">
      <section className="stats">
        <div className="metric"><Users /> <span>{students.length}</span><small>Students</small></div>
        <div className="metric"><AlertTriangle /> <span>{messages.filter((m) => m.isEscalated).length}</span><small>Escalated</small></div>
        <div className="metric"><Brain /> <span>{messages.length}</span><small>Messages</small></div>
      </section>

      <section className="layout">
        <div className="panel">
          <h2>Analyze Student Message</h2>
          {loading && <p className="muted">Loading dashboard...</p>}
          <form onSubmit={analyze}>
            <select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} required>
              <option value="">Select student</option>
              {students.map((student) => <option key={student._id} value={student._id}>{student.name}</option>)}
            </select>
            <textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} placeholder="Paste message..." required />
            <button className="primary" disabled={!selectedStudent}>Analyze</button>
          </form>
          {students.length === 0 && <p className="muted">No students yet. Add one below to start analyzing messages.</p>}
          {error && <div className="error">{error}</div>}
        </div>
        <div className="panel">
          <h2>Add Student</h2>
          <form onSubmit={createStudent}>
            <input
              placeholder="Student ID"
              value={studentForm.studentId}
              onChange={(e) => setStudentForm({ ...studentForm, studentId: e.target.value })}
              required
            />
            <input
              placeholder="Student name"
              value={studentForm.name}
              onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
              required
            />
            <input
              placeholder="Grade"
              value={studentForm.grade}
              onChange={(e) => setStudentForm({ ...studentForm, grade: e.target.value })}
              required
            />
            <input
              placeholder="Section"
              value={studentForm.section}
              onChange={(e) => setStudentForm({ ...studentForm, section: e.target.value })}
              required
            />
            <button className="primary">Add student</button>
          </form>
        </div>
      </section>

      <section className="layout">
        <AlertFeed alerts={alerts} />
      </section>

      <section className="panel">
        <h2>Labeling Queue</h2>
        <table>
          <thead><tr><th>Message</th><th>Severity</th><th>Label</th></tr></thead>
          <tbody>
            {messages.map((message) => (
              <tr key={message._id}>
                <td>{message.messageText}</td>
                <td>{message.prediction.severity}</td>
                <td>
                  <button type="button" onClick={() => api.patch(`/messages/${message._id}/label`, { manualLabel: 0 }).then(load).catch((err) => setError(err.response?.data?.error || "Could not label message"))}>Safe</button>
                  <button type="button" onClick={() => api.patch(`/messages/${message._id}/label`, { manualLabel: 1 }).then(load).catch((err) => setError(err.response?.data?.error || "Could not label message"))}>Bully</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
