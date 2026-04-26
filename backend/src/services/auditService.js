import { AuditLog } from "../models/index.js";

export async function writeAudit({ req, action, resourceType, resourceId, metadata = {} }) {
  await AuditLog.create({
    actorId: req.user?._id,
    action,
    resourceType,
    resourceId,
    metadata,
    ipAddress: req.ip
  });
}
