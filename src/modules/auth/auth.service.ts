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
import { SECURITY_CONFIG } from '../../config/security';

/**
 * Attempt record:
 * - count: jumlah gagal saat ini dalam siklus aktif
 * - lockedUntil: timestamp (ms) ketika lock berakhir; undefined jika tidak terkunci
 */
const loginAttempts = new Map<string, { count: number; lockedUntil?: number }>();

function isLocked(username: string): boolean {
  const rec = loginAttempts.get(username);
  if (!rec) return false;

  // jika terkunci dan waktu lock belum habis
  if (rec.lockedUntil && Date.now() < rec.lockedUntil) {
    return true;
  }

  // jika ada lockedUntil tapi sudah lewat, reset siklus
  if (rec.lockedUntil && Date.now() >= rec.lockedUntil) {
    loginAttempts.delete(username);
    return false;
  }

  return false;
}

function recordFailure(username: string) {
  const now = Date.now();
  const current = loginAttempts.get(username);

  if (!current) {
    loginAttempts.set(username, { count: 1 });
    return { count: 1, justLocked: false };
  }

  // jika sebelumnya pernah lock dan sudah lewat waktunya → reset siklus
  if (current.lockedUntil && now >= current.lockedUntil) {
    loginAttempts.set(username, { count: 1 });
    return { count: 1, justLocked: false };
  }

  // increment gagal
  const nextCount = (current.count ?? 0) + 1;

  // capai batas → set lockedUntil
  if (nextCount >= SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS) {
    loginAttempts.set(username, {
      count: nextCount,
      lockedUntil: now + SECURITY_CONFIG.LOCKOUT_DURATION_MS
    });
    return { count: nextCount, justLocked: true };
  }

  // update biasa (belum lock)
  current.count = nextCount;
  loginAttempts.set(username, current);
  return { count: nextCount, justLocked: false };
}

function resetAttempts(username: string) {
  loginAttempts.delete(username);
}

function getLockInfo(username: string) {
  const rec = loginAttempts.get(username);
  if (!rec?.lockedUntil) return { locked: false as const };

  const now = Date.now();
  const remainingMs = Math.max(rec.lockedUntil - now, 0);

  return {
    locked: remainingMs > 0,
    lockedUntil: rec.lockedUntil,
    remainingMs,
  };
}


export const authService = {
  async login(app: FastifyInstance, username: string, password: string, requestId?: string) {
    // 1) hard lock check
    if (isLocked(username)) {
      const info = getLockInfo(username);

      AuditLogger.logFailure(AuditAction.LOGIN_FAILED, ERROR_CODES.AUTH_ACCOUNT_LOCKED, {
        userId: username,
        requestId,
        description: 'Account locked due to too many failed attempts'
      });

      throw new ApplicationError(
        ERROR_CODES.AUTH_ACCOUNT_LOCKED,
        ERROR_MESSAGES[ERROR_CODES.AUTH_ACCOUNT_LOCKED],
        {
          locked: true,
          lockedUntil: info.lockedUntil,
          remainingMs: info.remainingMs,
          maxAttempts: SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS,
        }, // <-- details ke FE
        requestId,
        423
      );
    }


    // 2) authenticate
    const user = await userRepository.findByUsername(username);
    const valid = !!user && safeCompare(password, user.password);

    if (!valid) {
      const { count, justLocked } = recordFailure(username);

      if (justLocked) {
        const info = getLockInfo(username); // setelah recordFailure set lockedUntil

        AuditLogger.logFailure(AuditAction.LOGIN_FAILED, ERROR_CODES.AUTH_ACCOUNT_LOCKED, {
          userId: username,
          requestId,
          description: 'Account locked due to too many failed attempts (threshold reached)'
        });

        throw new ApplicationError(
          ERROR_CODES.AUTH_ACCOUNT_LOCKED,
          ERROR_MESSAGES[ERROR_CODES.AUTH_ACCOUNT_LOCKED],
          {
            locked: true,
            lockedUntil: info.lockedUntil,
            remainingMs: info.remainingMs,
            maxAttempts: SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS,
          },
          requestId,
          423
        );
      }


      const remaining = Math.max(
        SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS - count,
        0
      );

      console.log("remaining", remaining)
      AuditLogger.logFailure(AuditAction.LOGIN_FAILED, ERROR_CODES.AUTH_INVALID_CREDENTIALS, {
        userId: username,
        requestId,
        description: `Invalid credentials (${remaining} attempt${remaining === 1 ? '' : 's'} left)`
      });

      const message =
        remaining > 0
          ? `Invalid username or passwords. You have ${remaining} attempt${remaining === 1 ? '' : 's'} left.`
          : ERROR_MESSAGES[ERROR_CODES.AUTH_ACCOUNT_LOCKED]; // fallback, mestinya tertangani di justLocked

      throw new ApplicationError(
        ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        message,
        {
          locked: false,
          attemptsLeft: remaining,
          maxAttempts: SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS,
        }, // <-- details
        requestId,
        401
      );

    }

    // 3) success → reset siklus
    resetAttempts(username);

    const payload: TokenPayload = {
      sub: user!.username,
      role: user!.role,
      name: user!.name
    };

    const token = app.jwt.sign(payload, { expiresIn: env.TOKEN_EXPIRES_IN });

    const publicUser: User = {
      username: user!.username,
      name: user!.name,
      role: user!.role
    };

    AuditLogger.logSuccess(AuditAction.LOGIN_SUCCESS, {
      userId: user!.username,
      userName: user!.name,
      userRole: user!.role,
      requestId,
      description: 'User logged in successfully'
    });

    return { token, expiresIn: env.TOKEN_EXPIRES_IN, user: publicUser };
  },
  async logout(app: FastifyInstance, token: string, requestId?: string) {
    // masukkan token ke blacklist
    // blacklistToken(token);

    // decode untuk audit (tanpa verifikasi, hanya baca payload)
    const decoded = app.jwt.decode(token) as any | null;

    AuditLogger.logSuccess(AuditAction.LOGOUT_SUCCESS, {
      userId: decoded?.sub ?? 'unknown',
      userRole: decoded?.role ?? 'unknown',
      requestId,
      description: 'User logged out',
    });
    return true;
  }

};
