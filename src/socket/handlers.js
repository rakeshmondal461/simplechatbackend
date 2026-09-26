import { pool } from "../config/db.js";
import { markOnline, markOffline, getOnlineUserIds } from "../config/presence.js";

async function registerSocketHandlers(io, socket) {
  const userId = socket.userId;

  // ── Online presence: mark user online and notify everyone else ──────────────
  try {
    await markOnline(userId);
    // Broadcast to every connected socket EXCEPT this one
    socket.broadcast.emit("presence:online", { userId });
    // Send the current full online list only to the newly connected socket
    const onlineSet = await getOnlineUserIds();
    socket.emit("online:init", [...onlineSet]);
    console.log(`User connected: ${userId} (${socket.id})`);
  } catch (err) {
    console.error(`Failed to mark user ${userId} online:`, err);
  }

  socket.on("room:join", (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit("room:user_joined", { userId, roomId });
  });

  socket.on("room:leave", (roomId) => {
    socket.leave(roomId);
    socket.to(roomId).emit("room:user_left", { userId, roomId }); // everyone in the room excluding sender
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
        [roomId, userId, content.trim()]
      );

      const message = result.rows[0];

      io.to(roomId).emit("message:new", message); // everyone in the room including sender
      callback?.({ ok: true, message });
    } catch (err) {
      console.error("Failed to save message:", err);
      callback?.({ ok: false, error: "Failed to send message" });
    }
  });

  socket.on("typing:start", (roomId) => {
    socket.to(roomId).emit("typing:start", { userId, username: socket.username, roomId });
  });

  socket.on("typing:stop", (roomId) => {
    socket.to(roomId).emit("typing:stop", { userId, username: socket.username, roomId });
  });

  // ── Online presence: mark user offline on disconnect ────────────────────────
  socket.on("disconnect", async (reason) => {
    console.log(`User disconnected: ${userId} (${reason})`);

    try {
      // Check whether the user still has other active sockets (multi-tab support).
      // io.in(userId) uses a per-user room; if no sockets remain, we go offline.
      const remainingSockets = await io.in(`user:${userId}`).fetchSockets();
      if (remainingSockets.length === 0) {
        await markOffline(userId);
        // Notify everyone that this user went offline
        socket.broadcast.emit("presence:offline", { userId });
      }
    } catch (err) {
      console.error(`Failed to mark user ${userId} offline:`, err);
    }
  });
}

// Join a per-user room so we can check remaining connections on disconnect
async function joinUserRoom(socket) {
  socket.join(`user:${socket.userId}`);
}

export { registerSocketHandlers, joinUserRoom };