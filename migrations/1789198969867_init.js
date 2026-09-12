exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createExtension("pgcrypto", { ifNotExists: true });

  pgm.createTable("users", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    username: { type: "text", notNull: true, unique: true },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });

  pgm.createTable("rooms", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    name: { type: "text", notNull: true },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });

  pgm.createTable("room_members", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    room_id: {
      type: "uuid",
      notNull: true,
      references: "rooms",
      onDelete: "cascade",
    },
    user_id: {
      type: "uuid",
      notNull: true,
      references: "users",
      onDelete: "cascade",
    },
    joined_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.addConstraint("room_members", "room_members_room_user_unique", {
    unique: ["room_id", "user_id"],
  });

  pgm.createTable("messages", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    room_id: {
      type: "uuid",
      notNull: true,
      references: "rooms",
      onDelete: "cascade",
    },
    sender_id: {
      type: "uuid",
      notNull: true,
      references: "users",
      onDelete: "cascade",
    },
    content: { type: "text", notNull: true },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("messages", ["room_id", "created_at"]);
};

exports.down = (pgm) => {
  pgm.dropTable("messages");
  pgm.dropTable("room_members");
  pgm.dropTable("rooms");
  pgm.dropTable("users");
};