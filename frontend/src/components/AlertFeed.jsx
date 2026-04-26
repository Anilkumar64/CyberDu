import React from "react";

export function AlertFeed({ alerts }) {
  return (
    <section className="panel">
      <h2>Live Alerts</h2>
      <div className="feed">
        {alerts.length === 0 && <p className="muted">No live alerts yet.</p>}
        {alerts.map((alert, index) => (
          <article className="feedItem" key={alert._id || index}>
            <strong>{alert.prediction?.severity || "ALERT"}</strong>
            <span>{alert.messageText}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
