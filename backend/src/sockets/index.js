import { verifyAccessToken } from "../utils/tokens.js";

export function configureSockets(io) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const payload = verifyAccessToken(token);
      socket.user = payload;
      next();
    } catch {
      next(new Error("Unauthorized socket"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.user.sub}`);
    socket.join(`teacher:${socket.user.sub}`);
    if (socket.user.schoolId) socket.join(`school:${socket.user.schoolId}`);

    socket.on("watch-student", (studentId) => {
      socket.join(`student:${studentId}`);
    });
  });
}
