const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const { getRedisClients } = require("../config/redis");
const { socketAuthMiddleware } = require("./auth");
const { registerSocketHandlers } = require("./handlers");

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

module.exports = { initSocket };