import React, { useEffect, useState } from "react";
import { api } from "../services/api";

export function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    try {
      const { data } = await api.get("/admin/overview");
      setOverview(data);
    } catch (err) {
      setError(err.response?.data?.error || "Could not load admin overview");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function bulkRetrain() {
    try {
      await api.post("/admin/bulk-retrain");
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not start bulk retrain");
    }
  }

  return (
    <div className="dashboard">
      <section className="panel">
        <h2>School Overview</h2>
        {error && <div className="error">{error}</div>}
        <button className="primary" onClick={bulkRetrain}>Bulk Retrain</button>
        <div className="stats">
          <div className="metric"><span>{overview?.students || 0}</span><small>Total Students</small></div>
          <div className="metric"><span>{overview?.criticalMessages || 0}</span><small>Critical Incidents</small></div>
          <div className="metric"><span>{overview?.models?.length || 0}</span><small>Recent Models</small></div>
        </div>
      </section>
      <section className="panel">
        <h2>Risk by Grade / Section</h2>
        <pre>{JSON.stringify(overview?.riskByGrade || [], null, 2)}</pre>
      </section>
    </div>
  );
}
