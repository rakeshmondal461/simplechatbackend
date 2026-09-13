import jwt from "jsonwebtoken";

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not set — check your environment configuration');
}
/**
 * Express middleware that verifies a Bearer JWT from the Authorization header.
 * On success, attaches `req.user = { id, username }` to the request.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authorization header missing or malformed" });
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, username: payload.username };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export { requireAuth };
