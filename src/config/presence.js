/**
 * presence.js
 *
 * Redis-backed online presence store.
 *
 * Storage strategy: a Redis Set keyed `online_users` whose members are
 * user-ID strings.  Using a Set gives O(1) add / remove and O(N) full-list
 * retrieval — perfectly suited for a chat app with hundreds of concurrent
 * users.
 *
 * NOTE: This intentionally reuses the existing `pubClient` so we don't open
 * a third connection.  All operations are fire-and-forget at the call site
 * (callers await them so errors surface, but the app keeps running if Redis
 * has a hiccup).
 */

import { getRedisClients } from "./redis.js";

const PRESENCE_KEY = "online_users";

/**
 * Mark a user as online.
 * @param {string} userId
 */
async function markOnline(userId) {
  const { pubClient } = await getRedisClients();
  await pubClient.sAdd(PRESENCE_KEY, String(userId));
}

/**
 * Mark a user as offline.
 * Removes the user only when they have no remaining socket connections
 * (the caller is responsible for reference-counting if needed; here we
 * always remove since Socket.io fires disconnect per socket).
 *
 * @param {string} userId
 */
async function markOffline(userId) {
  const { pubClient } = await getRedisClients();
  await pubClient.sRem(PRESENCE_KEY, String(userId));
}

/**
 * Returns the Set of all currently-online user IDs.
 * @returns {Promise<Set<string>>}
 */
async function getOnlineUserIds() {
  const { pubClient } = await getRedisClients();
  const members = await pubClient.sMembers(PRESENCE_KEY);
  return new Set(members);
}

/**
 * Returns true if the given user is currently online.
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
async function isOnline(userId) {
  const { pubClient } = await getRedisClients();
  return pubClient.sIsMember(PRESENCE_KEY, String(userId));
}

export { markOnline, markOffline, getOnlineUserIds, isOnline };
