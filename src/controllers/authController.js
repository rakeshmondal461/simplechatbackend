import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../config/db.js";

class AuthController {
  static signToken(user) {
    return jwt.sign(
      { sub: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
    );
  }

  static async login(req, res) {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "username and password are required" });
    }

    try {
      const result = await pool.query(
        `SELECT id, username, password_hash, created_at FROM users WHERE username = $1`,
        [username.trim()],
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const user = result.rows[0];
      const valid = await bcrypt.compare(password, user.password_hash);

      if (!valid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = AuthController.signToken(user);
      const { password_hash, ...safeUser } = user;

      return res.json({ message: "login successfull", token, user: safeUser });
    } catch (err) {
      console.error("Login error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  static async register(req, res) {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "username and password are required" });
    }
    if (username.trim().length < 2) {
      return res
        .status(400)
        .json({ error: "username must be at least 2 characters" });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "password must be at least 6 characters" });
    }

    try {
      const password_hash = await bcrypt.hash(password, 12);

      const result = await pool.query(
        `INSERT INTO users (username, password_hash)
       VALUES ($1, $2)
       RETURNING id, username, created_at`,
        [username.trim(), password_hash],
      );

      const user = result.rows[0];
      const token = AuthController.signToken(user);

      return res.status(201).json({ token, user });
    } catch (err) {
      if (err.code === "23505") {
        // unique_violation — username already taken
        return res.status(409).json({ error: "Username already taken" });
      }
      console.error("Register error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}

export default AuthController;
