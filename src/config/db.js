const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ssl: { rejectUnauthorized: false }, // uncomment if your host requires SSL
});

pool.on("error", (err) => {
  console.error("Unexpected Postgres error on idle client", err);
});

async function checkConnection() {
  await pool.query("SELECT 1");
}

module.exports = { pool, checkConnection };