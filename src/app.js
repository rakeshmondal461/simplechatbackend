const express = require("express");
const cors = require("cors");
const { pool } = require("./config/db");
const authRouter = require("./routes/auth");
const userRouter = require("./routes/user");
const chatRouter = require("./routes/chat");

const app = express();

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*" }));
app.use(express.json());

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/chat", chatRouter);

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok" });
  } catch (err) {
    res.status(500).json({ status: "error", error: err.message });
  }
});

module.exports = app;
