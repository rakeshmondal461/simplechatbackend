exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn("users", {
    password_hash: { type: "text", notNull: true, default: "" },
  });
  // Remove the default after adding — it was only needed to populate existing rows
  pgm.alterColumn("users", "password_hash", { default: null });
};

exports.down = (pgm) => {
  pgm.dropColumn("users", "password_hash");
};
