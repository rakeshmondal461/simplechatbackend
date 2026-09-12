const http = require("http");
const app = require("./src/app");
const { initSocket } = require("./src/socket");
const { checkConnection } = require("./src/config/db");
const { closeRedisClients } = require("./src/config/redis");
const { pool } = require("./src/config/db");

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
