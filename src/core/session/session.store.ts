import { SECURITY_CONFIG } from '../../config/security';


type Session = {
  userId: string;
  createdAt: number;
  lastActiveAt: number;
};

const sessions = new Map<string, Session>();

export const sessionStore = {
  create(userId: string) {
    const id = crypto.randomUUID();
    const now = Date.now();
    sessions.set(id, { userId, createdAt: now, lastActiveAt: now });
    return id;
  },

  get(sessionId: string) {
    return sessions.get(sessionId);
  },

  updateActivity(sessionId: string) {
    const s = sessions.get(sessionId);
    if (s) s.lastActiveAt = Date.now();
  },

  isExpired(sessionId: string) {
    const s = sessions.get(sessionId);
    if (!s) return true;
    const now = Date.now();
    return (
      now - s.lastActiveAt > SECURITY_CONFIG.SESSION_TIMEOUT_MS ||
      now - s.createdAt > SECURITY_CONFIG.MAX_SESSION_DURATION_MS
    );
  },

  remove(sessionId: string) {
    sessions.delete(sessionId);
  }
};

export const tokenBlacklist = new Set<string>()
export function blacklistToken(token : string) {
  tokenBlacklist.add(token)
}
export function isTokenBlacklisted(token:string) {
  return tokenBlacklist.has(token)
}