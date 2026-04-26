import React, { useEffect, useState } from "react";
import { api } from "../services/api";

export function SuperadminDashboard() {
  const [schools, setSchools] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/schools")
      .then((res) => setSchools(res.data.schools))
      .catch((err) => setError(err.response?.data?.error || "Could not load schools"));
  }, []);

  return (
    <div className="dashboard">
      <section className="panel">
        <h2>Multi-school Control Plane</h2>
        {error && <div className="error">{error}</div>}
        <table>
          <thead><tr><th>School</th><th>Plan</th><th>Max Students</th></tr></thead>
          <tbody>
            {schools.map((school) => (
              <tr key={school._id}>
                <td>{school.schoolName}</td>
                <td>{school.subscription}</td>
                <td>{school.maxStudents}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
