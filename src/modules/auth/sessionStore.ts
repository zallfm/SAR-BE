type Sess = { jti: string; expMs: number };
const store = new Map<string, Map<string, Sess>>();

function cleanupUser(username: string, now = Date.now()) {
  const userMap = store.get(username);
  if (!userMap) return;
  for (const [jti, s] of userMap) {
    if (s.expMs <= now) userMap.delete(jti);
  }
  if (userMap.size === 0) store.delete(username);
}

export function getActiveSessions(username: string): Sess[] {
  cleanupUser(username);
  return Array.from(store.get(username)?.values() ?? []);
}

export function addSession(username: string, jti: string, expMs: number) {
  cleanupUser(username);
  const userMap = store.get(username) ?? new Map<string, Sess>();
  userMap.set(jti, { jti, expMs });
  store.set(username, userMap);
}

export function removeSession(username: string, jti: string) {
  const userMap = store.get(username);
  if (!userMap) return;
  userMap.delete(jti);
  if (userMap.size === 0) store.delete(username);
}

export function isSessionActive(username: string, jti: string): boolean {
  const userMap = store.get(username);
  const s = userMap?.get(jti);
  if (!s) return false;
  if (s.expMs <= Date.now()) {
    userMap!.delete(jti);
    return false;
  }
  return true;
}
