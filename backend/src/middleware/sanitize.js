function cleanValue(value) {
  if (typeof value === "string") return value.replace(/[<>]/g, "").trim();
  if (Array.isArray(value)) return value.map(cleanValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, cleanValue(val)]));
  }
  return value;
}

export function sanitizeInput(req, res, next) {
  req.body = cleanValue(req.body || {});
  req.query = cleanValue(req.query || {});
  next();
}
