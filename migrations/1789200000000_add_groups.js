exports.shorthands = undefined;

exports.up = (pgm) => {
  // Mark rooms as group or direct
  pgm.addColumn("rooms", {
    is_group: { type: "boolean", notNull: true, default: false },
  });

  // Track the admin/member role per membership
  pgm.addColumn("room_members", {
    role: { type: "text", notNull: true, default: "member" }, // 'admin' | 'member'
  });
};

exports.down = (pgm) => {
  pgm.dropColumn("room_members", "role");
  pgm.dropColumn("rooms", "is_group");
};
