export function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err, req, res, next) {
  console.error(err);
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors).map((error) => error.message).join(", ");
    return res.status(400).json({ error: message || "Validation failed" });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "record";
    return res.status(409).json({ error: `${field} already exists` });
  }
  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 ? "Internal server error" : err.message
  });
}
