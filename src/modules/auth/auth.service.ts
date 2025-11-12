import type { FastifyInstance } from 'fastify';
import { userRepository } from './user.repository';
import { safeCompare } from '../../utils/crypto';
import { ApplicationError } from '../../core/errors/applicationError';
import { ERROR_CODES } from '../../core/errors/errorCodes';
import { ERROR_MESSAGES } from '../../core/errors/errorMessages';
import type { User, TokenPayload } from '../../types/auth';
import { AuditLogger } from '../../core/audit/auditLogger';
import { AuditAction } from '../../core/audit/auditActions';
import { env } from '../../config/env';
import crypto from 'crypto';
import { SECURITY_CONFIG } from '../../config/security';
import { ServiceResponse } from '../../api/common/models/ServiceResponse';
import { publishMonitoringLog } from '../log_monitoring/log_publisher';
import { addSession, getActiveSessions, removeSession } from './sessionStore';

const loginAttempts = new Map<string, { count: number; lockedUntil?: number }>();

function isLocked(username: string): boolean {
  const rec = loginAttempts.get(username);
  if (!rec) return false;
  if (rec.lockedUntil && Date.now() < rec.lockedUntil) return true;
  if (rec.lockedUntil && Date.now() >= rec.lockedUntil) {
    loginAttempts.delete(username);
    return false;
  }
  return false;
}

function recordFailure(username: string, lockDurationMs: number) {
  const now = Date.now();
  const current = loginAttempts.get(username);

  if (!current) {
    loginAttempts.set(username, { count: 1 });
    return { count: 1, justLocked: false };
  }

  if (current.lockedUntil && now >= current.lockedUntil) {
    loginAttempts.set(username, { count: 1 });
    return { count: 1, justLocked: false };
  }

  const nextCount = (current.count ?? 0) + 1;

  if (nextCount >= SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS) {
    loginAttempts.set(username, {
      count: nextCount,
      lockedUntil: now + (lockDurationMs > 0 ? lockDurationMs : SECURITY_CONFIG.LOCKOUT_DURATION_MS),
    });
    return { count: nextCount, justLocked: true };
  }

  current.count = nextCount;
  loginAttempts.set(username, current);
  return { count: nextCount, justLocked: false };
}

function resetAttempts(username: string) {
  loginAttempts.delete(username);
}
function daysBetween(a: Date, b: Date) {
  return Math.ceil((a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000));
}

function getLockInfo(username: string) {
  const rec = loginAttempts.get(username);
  if (!rec?.lockedUntil) return { locked: false as const };
  const now = Date.now();
  const remainingMs = Math.max(rec.lockedUntil - now, 0);
  return { locked: remainingMs > 0, lockedUntil: rec.lockedUntil, remainingMs };
}

function toSeconds(v: string | number | undefined): number {
  if (!v) return 3600;
  if (typeof v === 'number') return v;
  const m = String(v).trim().toLowerCase().match(/^(\d+)\s*([smhd])?$/);
  if (!m) return Number(v) || 3600;
  const n = Number(m[1]);
  const unit = m[2] || 's';
  const mult = unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3600 : 86400;
  return n * mult;
}

export const authService = {
  async login(app: FastifyInstance, username: string, password: string, requestId?: string) {
    if (isLocked(username)) {
      const info = getLockInfo(username);
      AuditLogger.logFailure(AuditAction.LOGIN_FAILED, ERROR_CODES.AUTH_ACCOUNT_LOCKED, {
        userId: username, requestId, description: 'Account locked due to too many failed attempts'
      });
      publishMonitoringLog(app, {
        userId: username, module: 'AUTH', action: 'LOGIN_FAILED', status: 'Error',
        description: 'Account locked due to too many failed attempts', location: '/login'
      });
      throw new ApplicationError(
        ERROR_CODES.AUTH_ACCOUNT_LOCKED,
        ERROR_MESSAGES[ERROR_CODES.AUTH_ACCOUNT_LOCKED],
        {
          locked: true, lockedUntil: info.lockedUntil, remainingMs: info.remainingMs,
          maxAttempts: SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS
        },
        requestId, 423
      );
    }

    const sec = await userRepository.getSecurity(username);
    const lockMs = (sec.lockTimeoutSec ?? 0) * 1000;
    const maxConc = Math.max(Number(sec.maxConcurrent ?? 0), 0);

    const active = getActiveSessions(username);
    if (maxConc > 0 && active.length >= maxConc) {
      AuditLogger.logFailure(AuditAction.LOGIN_FAILED, 'AUTH_MAX_CONCURRENT_REACHED' as any, {
        userId: username, requestId, description: `Max concurrent reached (${maxConc})`
      });
      throw new ApplicationError(
        ERROR_CODES.AUTH_ACCOUNT_LOCKED,
        `Maximum concurrent sessions (${maxConc}) reached for this account.`,
        { maxConcurrent: maxConc, activeSessions: active.length },
        requestId,
        429
      );
    }

    let user: any;
    try {
      user = await userRepository.login(username, password);
    } catch (e) {
      const { count, justLocked } = recordFailure(username, lockMs);
      if (justLocked) {
        const info = getLockInfo(username);
        AuditLogger.logFailure(AuditAction.LOGIN_FAILED, ERROR_CODES.AUTH_ACCOUNT_LOCKED, {
          userId: username, requestId,
          description: 'Account locked due to too many failed attempts (threshold reached)'
        });
        publishMonitoringLog(app, {
          userId: username, module: 'AUTH', action: 'LOGIN_FAILED', status: 'Error',
          description: 'Account locked (threshold reached)', location: '/login'
        });
        throw new ApplicationError(
          ERROR_CODES.AUTH_ACCOUNT_LOCKED,
          ERROR_MESSAGES[ERROR_CODES.AUTH_ACCOUNT_LOCKED],
          {
            locked: true, lockedUntil: info.lockedUntil, remainingMs: info.remainingMs,
            maxAttempts: SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS, lockTimeoutMs: lockMs || SECURITY_CONFIG.LOCKOUT_DURATION_MS,
          },
          requestId, 423
        );
      }
      const remaining = Math.max(SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS - count, 0);
      AuditLogger.logFailure(AuditAction.LOGIN_FAILED, ERROR_CODES.AUTH_INVALID_CREDENTIALS, {
        userId: username, requestId,
        description: `Invalid credentials (${remaining} attempt${remaining === 1 ? '' : 's'} left)`
      });
      publishMonitoringLog(app, {
        userId: username, module: 'AUTH', action: 'LOGIN_FAILED', status: 'Error',
        description: `Invalid credentials (${remaining} attempts left)`, location: '/login'
      });
      throw new ApplicationError(
        ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        remaining > 0
          ? `Invalid username or passwords. You have ${remaining} attempt${remaining === 1 ? '' : 's'} left.`
          : ERROR_MESSAGES[ERROR_CODES.AUTH_ACCOUNT_LOCKED],
        { locked: false, attemptsLeft: remaining, maxAttempts: SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS, nextLockDurationMs: lockMs || SECURITY_CONFIG.LOCKOUT_DURATION_MS },
        requestId, 401
      );
    }

    const PASSWORD_EXPIRED = (ERROR_CODES as any).AUTH_PASSWORD_EXPIRED ?? ERROR_CODES.AUTH_INVALID_CREDENTIALS;
    const expireAt: Date | null | undefined = (user as any)?.passwordExpireAt;
    if (expireAt && new Date() > expireAt) {
      AuditLogger.logFailure(AuditAction.LOGIN_FAILED, 'AUTH_PASSWORD_EXPIRED' as any, {
        userId: username, requestId, description: `Password expired at ${expireAt.toISOString()}`
      });
      throw new ApplicationError(
        PASSWORD_EXPIRED,
        'Your password has expired. Please change your password to continue.',
        { expired: true, passwordExpireAt: expireAt },
        requestId,
        403
      );
    }

    resetAttempts(username);

    const sessionTimeoutSec = Number((user as any)?.sessionTimeoutSec ?? 0);
    const perUserExpiresIn = sessionTimeoutSec > 0 ? sessionTimeoutSec : toSeconds(env.TOKEN_EXPIRES_IN);
    const jti = crypto.randomUUID();
    const payload: TokenPayload = { sub: user!.username, role: user!.role, name: user!.name };
    const token = app.jwt.sign(payload, { expiresIn: perUserExpiresIn, jti });

    const expiresAtMs = Date.now() + perUserExpiresIn * 1000;
    addSession(user!.username, jti, expiresAtMs);

    const publicUser: User = {
      username: user!.username, name: user!.name, role: user!.role,
      divisionId: 2, noreg: '100000', departmentId: 500,
    };

    AuditLogger.logSuccess(AuditAction.LOGIN_SUCCESS, {
      userId: user!.username, userName: user!.name, userRole: user!.role, requestId,
      description: 'User logged in successfully'
    });
    publishMonitoringLog(app, {
      userId: user!.username, module: 'AUTH', action: 'LOGIN_SUCCESS', status: 'Success',
      description: 'User logged in successfully', location: '/login'
    });

    let passwordWarning: { daysLeft: number; passwordExpireAt: Date } | undefined;
    if (expireAt) {
      const daysLeft = daysBetween(expireAt, new Date());
      if (daysLeft <= SECURITY_CONFIG.PASSWORD_EXPIRY_WARNING_DAYS) {
        passwordWarning = { daysLeft, passwordExpireAt: expireAt };
      }
    }

    return { token, jti, expiresIn: perUserExpiresIn, expiresAt: expiresAtMs, user: publicUser, passwordWarning };
  },
  async changePassword(username: string, oldPassword: string, newPassword: string) {
    const db = await userRepository.login(username, oldPassword).catch(() => null);
    if (!db) {
      throw new ApplicationError(
        ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        'Old password is incorrect.',
        null,
        undefined,
        400
      );
    }
    const expireAt = new Date(Date.now() + SECURITY_CONFIG.PASSWORD_MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
    await userRepository.updatePassword(username, newPassword, expireAt);
    return { expireAt };
  },

    async getMenu(username: string) {
  try {
    const menus = await userRepository.getMenu(username);
    return ServiceResponse.success('Menu found', menus);
  } catch {
    return ServiceResponse.failure('An error occurred while retrieving menu.', null, 500);
  }
},

  async getProfile(username: string) {
  try {
    const profile = await userRepository.getProfile(username);
    return ServiceResponse.success('Profile found', profile);
  } catch {
    return ServiceResponse.failure('An error occurred while retrieving profile.', null, 500);
  }
},

  async logout(app: FastifyInstance, token: string, requestId ?: string) {
  const decoded = app.jwt.decode(token) as any | null;
  const username = decoded?.sub;
  const jti = decoded?.jti;     // <— ambil JTI dari token
  if (username && jti) removeSession(username, jti); // <— hapus sesi aktif

  AuditLogger.logSuccess(AuditAction.LOGOUT_SUCCESS, {
    userId: username ?? 'unknown', userRole: decoded?.role ?? 'unknown',
    requestId, description: 'User logged out',
  });
  publishMonitoringLog(app, {
    userId: decoded?.name, module: 'AUTH', action: 'LOGOUT_SUCESS',
    status: 'Success', description: 'User logout successfully', location: '/logout'
  })
    .catch(e => app.log.warn({ err: e }, 'monitoring log failed (success)'));
  return true;
},

  async validate(username: string) {
  try {
    const user = await userRepository.getProfile(username);
    return user;
  } catch {
    // swallow
  }
}
};
