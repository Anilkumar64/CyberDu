import http from "http";
import { Server } from "socket.io";
import { connectDb } from "./config/db.js";
import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { configureSockets } from "./sockets/index.js";

const app = createApp();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: env.frontendOrigin,
    credentials: true
  }
});

app.set("io", io);
configureSockets(io);

await connectDb();

server.listen(env.port, () => {
  console.log(`CyberGuard backend running on http://127.0.0.1:${env.port}`);
});
