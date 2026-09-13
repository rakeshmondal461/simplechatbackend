import http from "http";
import app from "./src/app.js";
import { initSocket } from "./src/socket/index.js";
import { checkConnection, pool } from "./src/config/db.js";
import { closeRedisClients } from "./src/config/redis.js";

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

let io;

async function start() {
  try {
    await checkConnection(); // sanity check DB connection on boot
    io = await initSocket(server);

    server.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();

// ---------- Graceful shutdown ----------
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully...");
  io?.close();
  await closeRedisClients();
  await pool.end();
  server.close(() => process.exit(0));
});
