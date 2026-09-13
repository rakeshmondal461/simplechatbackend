import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL || "redis://redis:6379";

let pubClient;
let subClient;

async function getRedisClients() {
  if (pubClient && subClient) {
    return { pubClient, subClient };
  }

  pubClient = createClient({ url: REDIS_URL });
  subClient = pubClient.duplicate();

  pubClient.on("error", (err) => console.error("Redis pub client error", err));
  subClient.on("error", (err) => console.error("Redis sub client error", err));

  await Promise.all([pubClient.connect(), subClient.connect()]);

  return { pubClient, subClient };
}

async function closeRedisClients() {
  await Promise.all([pubClient?.quit(), subClient?.quit()].filter(Boolean));
}

export { getRedisClients, closeRedisClients };
