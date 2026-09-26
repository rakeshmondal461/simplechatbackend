import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { getRedisClients } from "../config/redis.js";
import { socketAuthMiddleware } from "./auth.js";
import { registerSocketHandlers, joinUserRoom } from "./handlers.js";

async function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  const { pubClient, subClient } = await getRedisClients();
  io.adapter(createAdapter(pubClient, subClient));
  console.log("Socket.io Redis adapter connected");

  io.use(socketAuthMiddleware);

  io.on("connection", async (socket) => {
    // Join a per-user room first (used for multi-tab presence counting)
    await joinUserRoom(socket);
    await registerSocketHandlers(io, socket);
  });

  return io;
}

export { initSocket };
