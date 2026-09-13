import { pool } from "../config/db.js";

function registerSocketHandlers(io, socket) {
  console.log(`User connected: ${socket.userId} (${socket.id})`);

  socket.on("room:join", (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit("room:user_joined", { userId: socket.userId, roomId });
  });

  socket.on("room:leave", (roomId) => {
    socket.leave(roomId);
    socket.to(roomId).emit("room:user_left", { userId: socket.userId, roomId });
  });

  socket.on("message:send", async ({ roomId, content }, callback) => {
    try {
      if (!roomId || !content?.trim()) {
        return callback?.({ ok: false, error: "roomId and content are required" });
      }

      const result = await pool.query(
        `INSERT INTO messages (room_id, sender_id, content, created_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING id, room_id, sender_id, content, created_at`,
        [roomId, socket.userId, content.trim()]
      );

      const message = result.rows[0];

      io.to(roomId).emit("message:new", message);
      callback?.({ ok: true, message });
    } catch (err) {
      console.error("Failed to save message:", err);
      callback?.({ ok: false, error: "Failed to send message" });
    }
  });

  socket.on("typing:start", (roomId) => {
    socket.to(roomId).emit("typing:start", { userId: socket.userId, roomId });
  });

  socket.on("typing:stop", (roomId) => {
    socket.to(roomId).emit("typing:stop", { userId: socket.userId, roomId });
  });

  socket.on("disconnect", (reason) => {
    console.log(`User disconnected: ${socket.userId} (${reason})`);
  });
}

export { registerSocketHandlers };