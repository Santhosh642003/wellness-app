import jwt from 'jsonwebtoken';

// Admin tokens are signed with ADMIN_JWT_SECRET (required in production) so that
// a leaked user JWT_SECRET cannot be used to forge admin tokens, and vice versa.
// Falls back to JWT_SECRET in dev when ADMIN_JWT_SECRET is not set.
function adminSecret() {
  return process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
}

function parseCookieToken(cookieHeader) {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [k, ...vs] = part.split('=');
    if (k.trim() === 'admin_token') return vs.join('=').trim();
  }
  return null;
}

export function adminAuth(req, res, next) {
  // Accept token from httpOnly cookie (preferred) or Authorization header (fallback for API clients)
  const token = parseCookieToken(req.headers.cookie)
    || req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }
  try {
    const payload = jwt.verify(token, adminSecret());
    if (payload.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    req.adminId = payload.adminId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export { adminSecret };
