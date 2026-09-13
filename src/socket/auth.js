import jwt from "jsonwebtoken";

/**
 * Socket.io authentication middleware.
 * Expects: socket.handshake.auth.token = "Bearer <jwt>" or just "<jwt>"
 * On success, attaches socket.userId and socket.username.
 */
function socketAuthMiddleware(socket, next) {
  const raw = socket.handshake.auth?.token;

  if (!raw) {
    return next(new Error("Authentication error: token required"));
  }

  // Support both "Bearer <token>" and raw token strings
  const token = raw.startsWith("Bearer ") ? raw.slice(7) : raw;

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = payload.sub;
    socket.username = payload.username;
    next();
  } catch (err) {
    return next(new Error("Authentication error: invalid or expired token"));
  }
}

export { socketAuthMiddleware };