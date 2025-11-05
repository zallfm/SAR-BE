import { SECURITY_CONFIG } from '../../config/security';
const sessions = new Map();
export const sessionStore = {
    create(userId) {
        const id = crypto.randomUUID();
        const now = Date.now();
        sessions.set(id, { userId, createdAt: now, lastActiveAt: now });
        return id;
    },
    get(sessionId) {
        return sessions.get(sessionId);
    },
    updateActivity(sessionId) {
        const s = sessions.get(sessionId);
        if (s)
            s.lastActiveAt = Date.now();
    },
    isExpired(sessionId) {
        const s = sessions.get(sessionId);
        if (!s)
            return true;
        const now = Date.now();
        return (now - s.lastActiveAt > SECURITY_CONFIG.SESSION_TIMEOUT_MS ||
            now - s.createdAt > SECURITY_CONFIG.MAX_SESSION_DURATION_MS);
    },
    remove(sessionId) {
        sessions.delete(sessionId);
    }
};
export const tokenBlacklist = new Set();
export function blacklistToken(token) {
    tokenBlacklist.add(token);
}
export function isTokenBlacklisted(token) {
    return tokenBlacklist.has(token);
}
