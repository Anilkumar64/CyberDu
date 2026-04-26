import { io } from "socket.io-client";

export function createSocket() {
  return io(import.meta.env.VITE_SOCKET_URL || "http://127.0.0.1:8080", {
    auth: {
      token: localStorage.getItem("accessToken")
    }
  });
}
