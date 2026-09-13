const { pool } = require("../config/db");

class ChatController {
  static async createChatRoom(roomName) {
    if (!roomName) {
      return false;
    }
    try {
      const result = await pool.query(
        `INSERT INTO rooms (name)
       VALUES ($1)
       RETURNING id, name, created_at`,
        [roomName.trim()],
      );

      const room = result.rows[0].id;
      return room;
    } catch (err) {
      if (err.code === "23505") {
        // unique_violation — username already taken
        return res.status(409).json({ error: "Username already taken" });
      }
      console.error("Register error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  static async createRoomWithMembers(senderId, receiverId) {
    if (!senderId || !receiverId) {
      throw new Error("senderId and receiverId are required");
    }

    if (senderId === receiverId) {
      const err = new Error("senderId and receiverId cannot be the same user");
      err.statusCode = 400;
      throw err;
    }

    const senderRes = await pool.query(
      `SELECT id, username, created_at FROM users WHERE id = $1`,
      [senderId],
    );
    if (senderRes.rows.length === 0) {
      const err = new Error("User not found");
      err.statusCode = 404;
      throw err;
    }
    const senderDetails = senderRes.rows[0];

    const receiverRes = await pool.query(
      `SELECT id, username, created_at FROM users WHERE id = $1`,
      [receiverId],
    );
    if (receiverRes.rows.length === 0) {
      const err = new Error("User not found");
      err.statusCode = 404;
      throw err;
    }
    const receiverDetails = receiverRes.rows[0];

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Serialize concurrent requests for this exact pair so two
      // simultaneous calls can't both pass the "no existing room" check
      // and each create their own room.
      const lockKey = [senderId, receiverId].sort().join(":");
      await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [
        lockKey,
      ]);

      // Reuse an existing direct room between these two users, if one
      // exists, instead of creating a new one.
      const existingRoomRes = await client.query(
        `SELECT room_id
           FROM room_members
          WHERE user_id = ANY($1::uuid[])
          GROUP BY room_id
         HAVING COUNT(DISTINCT user_id) = 2
            AND COUNT(*) FILTER (WHERE user_id = ANY($1::uuid[])) = 2`,
        [[senderId, receiverId]],
      );

      if (existingRoomRes.rows.length > 0) {
        await client.query("COMMIT");
        return {
          id: existingRoomRes.rows[0].room_id,
          senderId,
          receiverId,
          reused: true,
        };
      }

      const roomId = await ChatController.createChatRoom(
        `${senderDetails.username},${receiverDetails.username}`,
        client,
      );

      if (!roomId) {
        throw new Error("Failed to create chat room");
      }

      await client.query(
        `INSERT INTO room_members (room_id, user_id) VALUES ($1, $2)`,
        [roomId, senderId],
      );

      await client.query(
        `INSERT INTO room_members (room_id, user_id) VALUES ($1, $2)`,
        [roomId, receiverId],
      );

      await client.query("COMMIT");

      return { id: roomId, senderId, receiverId, reused: false };
    } catch (err) {
      await client.query("ROLLBACK");

      if (err.code === "23505") {
        const dupErr = new Error("Room membership already exists");
        dupErr.statusCode = 409;
        throw dupErr;
      }

      console.error("createRoomWithMembers error:", err);
      err.statusCode = err.statusCode || 500;
      throw err;
    } finally {
      client.release();
    }
  }

  static async initNewRoom(req, res) {
    const { receiverId } = req.body;
    const senderId = req.user.id;

    if (!senderId || !receiverId) {
      return res
        .status(400)
        .json({ error: "username and password are required" });
    }

    try {
      const result = await ChatController.createRoomWithMembers(
        senderId,
        receiverId,
      );

      return res
        .status(201)
        .json({ message: "Initialized new room", roomId: result.id });
    } catch (err) {
      if (err.code === "23505") {
        // unique_violation — username already taken
        return res.status(409).json({ error: "Username already taken" });
      }
      console.error("Register error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  static async fetchChatRoom(req, res) {
    try {
      const { id: receiverId } = req.params;

      console.log("receiverId>>>>", receiverId);

      const result = await pool.query(
        `
            SELECT room_id
            FROM room_members
            GROUP BY room_id
            HAVING COUNT(*) = 2
                AND COUNT(*) FILTER (WHERE user_id IN ($1, $2)) = 2
            `,
        [req.user.id, receiverId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Room not found" });
      }

      const roomid = result.rows[0];

      return res.json({
        message: "Room retrieved successfully",
        roomid,
      });
    } catch (err) {
      console.error("GET /users/me error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  static async getOneToOneMessages(req, res) {
    try {
      const { roomid } = req.parms;
      const result2 = await pool.query(
        `
            SELECT *
            FROM messages
            where room_id=$l1 and sender_id=$l2
            `,
        [roomid, req.user.id],
      );

      if (result2.rows.length === 0) {
        return res.status(404).json({ error: "No message found" });
      }

      return res.json({
        message: "chats retrieved successfully",
        chats: result2.rows[0],
      });
    } catch (err) {
      console.error("GET /users/me error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}

module.exports = ChatController;
