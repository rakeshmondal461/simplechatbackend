import { pool } from "../config/db.js";

class GroupController {
  /**
   * POST /api/groups/create
   * Body: { name: string }
   * Creates a group room and makes the caller the admin member.
   */
  static async createGroup(req, res) {
    const { name } = req.body;
    const userId = req.user.id;

    if (!name?.trim()) {
      return res.status(400).json({ error: "Group name is required" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const roomRes = await client.query(
        `INSERT INTO rooms (name, is_group) VALUES ($1, true)
         RETURNING id, name, is_group, created_at`,
        [name.trim()],
      );
      const room = roomRes.rows[0];

      await client.query(
        `INSERT INTO room_members (room_id, user_id, role) VALUES ($1, $2, 'admin')`,
        [room.id, userId],
      );

      await client.query("COMMIT");

      return res.status(201).json({ group: room });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("createGroup error:", err);
      return res.status(500).json({ error: "Internal server error" });
    } finally {
      client.release();
    }
  }

  /**
   * POST /api/groups/:id/members
   * Body: { userId: string }
   * Adds a user to the group. Only admins may add members.
   */
  static async addMember(req, res) {
    const { id: groupId } = req.params;
    const { userId: targetUserId } = req.body;
    const requesterId = req.user.id;

    if (!targetUserId) {
      return res.status(400).json({ error: "userId is required" });
    }

    try {
      // Check caller is an admin of the group
      const adminCheck = await pool.query(
        `SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2 AND role = 'admin'`,
        [groupId, requesterId],
      );
      if (adminCheck.rows.length === 0) {
        return res.status(403).json({ error: "Only group admins can add members" });
      }

      // Verify group exists and is_group = true
      const groupCheck = await pool.query(
        `SELECT id FROM rooms WHERE id = $1 AND is_group = true`,
        [groupId],
      );
      if (groupCheck.rows.length === 0) {
        return res.status(404).json({ error: "Group not found" });
      }

      // Verify target user exists
      const userCheck = await pool.query(`SELECT id FROM users WHERE id = $1`, [targetUserId]);
      if (userCheck.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      await pool.query(
        `INSERT INTO room_members (room_id, user_id, role) VALUES ($1, $2, 'member')
         ON CONFLICT (room_id, user_id) DO NOTHING`,
        [groupId, targetUserId],
      );

      return res.status(200).json({ message: "Member added successfully" });
    } catch (err) {
      console.error("addMember error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * DELETE /api/groups/:id/leave
   * Removes the caller from the group.
   * If the caller is the only admin, promotes the next member to admin first.
   * If no members remain after leaving, deletes the group.
   */
  static async leaveGroup(req, res) {
    const { id: groupId } = req.params;
    const userId = req.user.id;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Verify membership
      const memberCheck = await client.query(
        `SELECT role FROM room_members WHERE room_id = $1 AND user_id = $2`,
        [groupId, userId],
      );
      if (memberCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "You are not a member of this group" });
      }

      const isAdmin = memberCheck.rows[0].role === "admin";

      // Remove the user
      await client.query(
        `DELETE FROM room_members WHERE room_id = $1 AND user_id = $2`,
        [groupId, userId],
      );

      // Count remaining members
      const remainingRes = await client.query(
        `SELECT user_id, role FROM room_members WHERE room_id = $1 ORDER BY joined_at`,
        [groupId],
      );
      const remaining = remainingRes.rows;

      if (remaining.length === 0) {
        // No one left — delete the group (cascade deletes messages, members)
        await client.query(`DELETE FROM rooms WHERE id = $1`, [groupId]);
      } else if (isAdmin) {
        // Check if any admin remains
        const hasAdmin = remaining.some((r) => r.role === "admin");
        if (!hasAdmin) {
          // Promote the earliest-joined remaining member to admin
          await client.query(
            `UPDATE room_members SET role = 'admin' WHERE room_id = $1 AND user_id = $2`,
            [groupId, remaining[0].user_id],
          );
        }
      }

      await client.query("COMMIT");
      return res.status(200).json({ message: "You have left the group" });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("leaveGroup error:", err);
      return res.status(500).json({ error: "Internal server error" });
    } finally {
      client.release();
    }
  }

  /**
   * GET /api/groups
   * Returns all groups the caller is a member of.
   */
  static async listMyGroups(req, res) {
    const userId = req.user.id;
    try {
      const result = await pool.query(
        `SELECT r.id, r.name, r.created_at, rm.role,
                (SELECT COUNT(*) FROM room_members WHERE room_id = r.id) AS member_count
         FROM rooms r
         JOIN room_members rm ON rm.room_id = r.id
         WHERE rm.user_id = $1 AND r.is_group = true
         ORDER BY r.created_at DESC`,
        [userId],
      );
      return res.json({ groups: result.rows });
    } catch (err) {
      console.error("listMyGroups error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * GET /api/groups/:id/messages
   * Returns messages for a group the caller is a member of.
   */
  static async getGroupMessages(req, res) {
    const { id: groupId } = req.params;
    const userId = req.user.id;

    try {
      // Verify membership
      const memberCheck = await pool.query(
        `SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2`,
        [groupId, userId],
      );
      if (memberCheck.rows.length === 0) {
        return res.status(403).json({ error: "You are not a member of this group" });
      }

      const result = await pool.query(
        `SELECT m.id, m.room_id, m.sender_id, m.content, m.created_at,
                u.username AS sender_username,
                CASE WHEN m.sender_id = $2 THEN true ELSE false END AS sent_by_me
         FROM messages m
         JOIN users u ON u.id = m.sender_id
         WHERE m.room_id = $1
         ORDER BY m.created_at ASC`,
        [groupId, userId],
      );

      return res.json({ chats: result.rows });
    } catch (err) {
      console.error("getGroupMessages error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * GET /api/groups/:id/members
   * Returns all members of a group.
   */
  static async getGroupMembers(req, res) {
    const { id: groupId } = req.params;
    const userId = req.user.id;

    try {
      // Verify membership
      const memberCheck = await pool.query(
        `SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2`,
        [groupId, userId],
      );
      if (memberCheck.rows.length === 0) {
        return res.status(403).json({ error: "You are not a member of this group" });
      }

      const result = await pool.query(
        `SELECT u.id, u.username, u.created_at, rm.role, rm.joined_at
         FROM room_members rm
         JOIN users u ON u.id = rm.user_id
         WHERE rm.room_id = $1
         ORDER BY rm.joined_at ASC`,
        [groupId],
      );

      return res.json({ members: result.rows });
    } catch (err) {
      console.error("getGroupMembers error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}

export default GroupController;
