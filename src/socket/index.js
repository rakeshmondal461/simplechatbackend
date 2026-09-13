import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { getRedisClients } from "../config/redis.js";
import { socketAuthMiddleware } from "./auth.js";
import { registerSocketHandlers } from "./handlers.js";

async function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || "*",
      methods: ["GET", "POST"],
    },
  });

  const { pubClient, subClient } = await getRedisClients();
  io.adapter(createAdapter(pubClient, subClient));
  console.log("Socket.io Redis adapter connected");

  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    registerSocketHandlers(io, socket);
  });

  return io;
}

export { initSocket };