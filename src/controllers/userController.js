const { pool } = require("../config/db");

class userController {
  static async userProfile(req, res) {
    try {
      const result = await pool.query(
        `SELECT id, username, created_at FROM users WHERE id = $1`,
        [req.user.id],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      return res.json({ user: result.rows[0] });
    } catch (err) {
      console.error("GET /users/me error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  static async users(req, res) {
    try {
      const result = await pool.query(
        `SELECT id, username, created_at FROM users WHERE id <> $1`,
        [req.user.id],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      return res.json({ users: result.rows });
    } catch (err) {
      console.error("GET /users/me error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}

module.exports = userController;
