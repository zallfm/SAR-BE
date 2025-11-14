import React, { useState, useEffect, useRef } from "react";
import type { User } from "../../../../../types";
import { SystemIcon } from "../../../icons/SystemIcon";
import { EyeIcon } from "../../../icons/EyeIcon";
import { EyeSlashIcon } from "../../../icons/EyeSlashIcon";
import { ExclamationCircleIcon } from "../../../icons/ExclamationCircleIcon";
import { useLogging } from "../../../../hooks/useLogging";
import { sessionManager } from "../../../../services/sessionManager";
import { authService } from "../../../../services/authService";
import { SecurityValidator } from "../../../../services/securityValidator";
import { AuditLogger } from "../../../../services/auditLogger";
import { AuditAction } from "../../../../constants/auditActions";
import { SECURITY_CONFIG } from "../../../../config/security";

// ⬇️ import hook React Query untuk login
import { useLogin } from "../../../../hooks/useAuth";
import { useAuthStore } from "../../../../store/authStore";
// import { postLogMonitoringApi } from "@/src/api/log_monitoring";

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState(""); const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // error dari server / validasi UI
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    username?: string[];
    password?: string[];
  }>({});
  const [failedAttempts, setFailedAttempts] = useState<Record<string, number>>(
    {}
  );
  const [isLocked, setIsLocked] = useState<Record<string, boolean>>({});
  const { logAuthentication, logSecurity } = useLogging();

  // Animasi mount sederhana
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Typing indicators (UI only)
  const [isTypingUsername, setIsTypingUsername] = useState(false);
  const [isTypingPassword, setIsTypingPassword] = useState(false);
  const usernameTypingTimeoutRef = useRef<number | undefined>(undefined);
  const passwordTypingTimeoutRef = useRef<number | undefined>(undefined);

  // ⬇️ React Query login hook
  const { mutateAsync: doLogin, isPending } = useLogin();
  // ambil user dari store kalau mau
  const currentUser = useAuthStore((s) => s.currentUser);

  useEffect(() => {
    // Kalau sudah ada user di store (mis. reload halaman & state dipersist), langsung lanjut
    if (currentUser) {
      onLoginSuccess(currentUser);
      return;
    }
    // Initialize audit logger
    AuditLogger.initialize();
  }, [onLoginSuccess, currentUser]);

  const unameKey = username.trim().toLowerCase();
  const remainingAttempts = Math.max(
    SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS - (failedAttempts[unameKey] || 0),
    0
  );

  // Map error to short, and code-aware messages
  const mapFriendlyError = (err: any): string => {
    const rawMsg = String(err?.message || "");
    const status = err?.status;
    const code = err?.code || err?.errorCode || err?.details?.code;
    const offline = typeof navigator !== "undefined" && navigator && navigator.onLine === false;

    // Prefer DB/service error codes when available
    const codeMap: Record<string, string> = {
      AUTH_INVALID: "Invalid credentials.",
      ACCOUNT_LOCKED: "Account temporarily locked.",
      RATE_LIMITED: "Too many attempts. Try again later.",
      SERVICE_UNAVAILABLE: "Service unavailable. Please try again.",
      TIMEOUT: "Request timed out. Please try again.",
      NETWORK_ERROR: "Network error. Check your connection.",
    };
    if (code && codeMap[code]) return codeMap[code];

    if (offline) return "No internet connection.";

    if (/Failed to fetch|NetworkError|TypeError|ECONNREFUSED|ENOTFOUND/i.test(rawMsg) || status === 0) {
      return "Network error. Check your connection.";
    }

    if (status === 503 || status === 504) return "Service unavailable. Please try again.";
    if (status === 500) return "Server error. Please try again.";
    if (status === 401 || status === 403) return "Invalid credentials.";

    return rawMsg || "Login failed";
  };

  // const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  //   e.preventDefault();
  //   setError("");
  //   setValidationErrors({});
  //   setIsLoading(true);

  //   try {
  //     // Check if account is locked
  //     if (isLocked[username]) {
  //       setError(
  //         "Account is temporarily locked due to multiple failed attempts. Please try again later."
  //       );
  //       AuditLogger.logWarning(AuditAction.ACCOUNT_LOCKED, {
  //         userName: username,
  //         description: "Login attempt on locked account",
  //       });
  //       return;
  //     }

  //     // Validate input (using development mode for relaxed password validation)
  //     const usernameValidation = SecurityValidator.validateUsername(username);
  //     const passwordValidation = SecurityValidator.validatePassword(
  //       password,
  //       true
  //     ); // true = development mode

  //     if (!usernameValidation.isValid || !passwordValidation.isValid) {
  //       setValidationErrors({
  //         username: usernameValidation.errors,
  //         password: passwordValidation.errors,
  //       });
  //       setError("Please correct the validation errors below.");
  //       return;
  //     }

  //     // Attempt login with secure service
  //     const authResponse = await authService.login({
  //       username: usernameValidation.sanitizedValue,
  //       password: passwordValidation.sanitizedValue,
  //     });

  //     // Reset failed attempts on successful login
  //     setFailedAttempts((prev) => ({ ...prev, [username]: 0 }));
  //     setIsLocked((prev) => ({ ...prev, [username]: false }));

  //     // Create session
  //     sessionManager.createSession({
  //       userId: authResponse.user.username,
  //       username: authResponse.user.username,
  //       role: authResponse.user.role,
  //       name: authResponse.user.name,
  //       ip: "127.0.0.1",
  //       userAgent: navigator.userAgent,
  //     });

  //     // Log successful login
  //     logAuthentication("login_success", {
  //       username: authResponse.user.username,
  //       role: authResponse.user.role,
  //       name: authResponse.user.name,
  //       ip: "127.0.0.1",
  //       userAgent: navigator.userAgent,
  //       timestamp: new Date().toISOString(),
  //     });

  //     onLoginSuccess(authResponse.user);
  //   } catch (error) {
  //     const errorMessage =
  //       error instanceof Error ? error.message : "Login failed";
  //     setError(errorMessage);

  //     // Track failed attempts
  //     const currentAttempts = (failedAttempts[username] || 0) + 1;
  //     setFailedAttempts((prev) => ({ ...prev, [username]: currentAttempts }));

  //     // Log failed login attempt
  //     logAuthentication("login_failed", {
  //       username: username,
  //       reason: "invalid_credentials",
  //       attemptNumber: currentAttempts,
  //       ip: "127.0.0.1",
  //       userAgent: navigator.userAgent,
  //       timestamp: new Date().toISOString(),
  //     });

  //     // Lock account after max attempts
  //     if (currentAttempts >= SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS) {
  //       setIsLocked((prev) => ({ ...prev, [username]: true }));

  //       // Set auto-unlock timer
  //       setTimeout(() => {
  //         setIsLocked((prev) => ({ ...prev, [username]: false }));
  //         setFailedAttempts((prev) => ({ ...prev, [username]: 0 }));
  //       }, SECURITY_CONFIG.LOCKOUT_DURATION_MS);

  //       AuditLogger.logWarning(AuditAction.ACCOUNT_LOCKED, {
  //         userName: username,
  //         description: `Account locked after ${currentAttempts} failed attempts`,
  //       });
  //     }

  //     // Log suspicious activity for multiple failed attempts
  //     if (currentAttempts >= 3) {
  //       logSecurity(
  //         "multiple_failed_login_attempts",
  //         {
  //           username: username,
  //           attemptCount: currentAttempts,
  //           ip: "127.0.0.1",
  //           userAgent: navigator.userAgent,
  //           timestamp: new Date().toISOString(),
  //         },
  //         "Warning"
  //       );
  //     }

  //     // Log potential brute force attack
  //     if (currentAttempts >= 5) {
  //       logSecurity(
  //         "potential_brute_force_attack",
  //         {
  //           username: username,
  //           attemptCount: currentAttempts,
  //           ip: "127.0.0.1",
  //           userAgent: navigator.userAgent,
  //           timestamp: new Date().toISOString(),
  //         },
  //         "Error"
  //       );
  //     }
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setValidationErrors({});

    try {
      // Check lock
      if (isLocked[unameKey]) {
        setError('Account is temporarily locked due to multiple failed attempts. Please try again later.');
        AuditLogger.logWarning(AuditAction.ACCOUNT_LOCKED, {
          userName: username,
          description: 'Login attempt on locked account'
        });
        return;
      }

      // Validate input (development mode untuk password rule)
      const usernameValidation = SecurityValidator.validateUsername(username);
      const passwordValidation = SecurityValidator.validatePassword(password, true);

      if (!usernameValidation.isValid || !passwordValidation.isValid) {
        setValidationErrors({
          username: usernameValidation.errors,
          password: passwordValidation.errors
        });
        setError('Please correct the validation errors below.');
        return;
      }

      // ⬇️ PANGGIL API lewat React Query
      const res = await doLogin({
        username: usernameValidation.sanitizedValue,
        password: passwordValidation.sanitizedValue
      });

      // React Query hook sudah mengisi Zustand: token, user, expiry
      const user = res.data.user;

      // Reset counters
      setFailedAttempts(prev => ({ ...prev, [unameKey]: 0 }));
      setIsLocked(prev => ({ ...prev, [unameKey]: false }));

      // Buat session (opsional)
      sessionManager.createSession({
        userId: user.username,
        username: user.username,
        role: user.role,
        name: user.name,
        ip: '127.0.0.1',
        userAgent: navigator.userAgent,
      });

      // Audit log
      logAuthentication('login_success', {
        username: user.username,
        role: user.role,
        name: user.name,
        ip: '127.0.0.1',
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });

      // ⬇️ Log ke backend
      // await postLogMonitoringApi({
      //   userId: user.username,
      //   module: "Login",
      //   action: AuditAction.LOGIN_SUCCESS,
      //   status: "Success",
      //   description: `User ${user.username} success login`,
      //   location: "LoginPage",
      //   timestamp: new Date().toISOString(),
      // });


      // Beri tahu parent
      onLoginSuccess(user);

    } catch (err: any) {
      setError(mapFriendlyError(err));

      if (err?.status === 423 || err?.details?.locked) {
        const ms = Number(err?.details?.remainingMs ?? 0);
        setIsLocked(prev => ({ ...prev, [unameKey]: true }));
        setTimeout(() => {
          setIsLocked(prev => ({ ...prev, [unameKey]: false }));
          setFailedAttempts(prev => ({ ...prev, [unameKey]: 0 }));
        }, Math.max(ms, 0));
      }


      // Track attempts (prefer backend details.attemptsLeft when provided)
      const backendAttemptsLeft = Number(err?.details?.attemptsLeft);
      const max = SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS;
      const currentAttempts = Number.isFinite(backendAttemptsLeft)
        ? Math.max(0, Math.min(max, max - backendAttemptsLeft))
        : (failedAttempts[unameKey] || 0) + 1;
      setFailedAttempts(prev => ({ ...prev, [unameKey]: currentAttempts }));

      // Audit log gagal
      logAuthentication('login_failed', {
        username,
        reason: 'invalid_credentials',
        attemptNumber: currentAttempts,
        ip: '127.0.0.1',
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });

      // await postLogMonitoringApi({
      //   userId: username,
      //   module: "Login",
      //   action: AuditAction.LOGIN_FAILED,
      //   status: "Error",
      //   description: `User ${username} gagal login (${err?.message || "invalid credentials"})`,
      //   location: "LoginPage",
      //   timestamp: new Date().toISOString(),
      // });


      // Lock setelah mencapai batas
      if (currentAttempts >= SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS) {
        setIsLocked(prev => ({ ...prev, [unameKey]: true }));

        setTimeout(() => {
          setIsLocked(prev => ({ ...prev, [unameKey]: false }));
          setFailedAttempts(prev => ({ ...prev, [unameKey]: 0 }));
        }, SECURITY_CONFIG.LOCKOUT_DURATION_MS);

        AuditLogger.logWarning(AuditAction.ACCOUNT_LOCKED, {
          userName: username,
          description: `Account locked after ${currentAttempts} failed attempts`
        });
      }

      // Warning & brute force signals
      if (currentAttempts >= 3) {
        logSecurity('multiple_failed_login_attempts', {
          username, attemptCount: currentAttempts,
          ip: '127.0.0.1', userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }, 'Warning');
      }
      if (currentAttempts >= 5) {
        logSecurity('potential_brute_force_attack', {
          username, attemptCount: currentAttempts,
          ip: '127.0.0.1', userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }, 'Error');
      }
    }
  };

  // Reusable form block
  const FormBlock = (
    <div className={`mx-auto w-full max-w-md transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Login to Account</h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">Please enter username and password to continue</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className={`transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`} style={{ transitionDelay: "80ms" }}>
          <label
            htmlFor="username"
            className="text-sm font-semibold text-gray-700 dark:text-slate-200 block"
          >
            Username <span className="text-red-500">*</span>
          </label>
          <div className="relative mt-2">
            <span className={`pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-full bg-gradient-to-b from-blue-400 to-indigo-400 transition-opacity ${isTypingUsername ? "opacity-100" : "opacity-0"}`}></span>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setIsTypingUsername(true);
                if (usernameTypingTimeoutRef.current) window.clearTimeout(usernameTypingTimeoutRef.current);
                usernameTypingTimeoutRef.current = window.setTimeout(() => setIsTypingUsername(false), 300);
              }}
              placeholder="Enter the username"
              maxLength={SECURITY_CONFIG.MAX_INPUT_LENGTH.username}
              className={`block w-full px-4 py-3 pl-5 rounded-xl bg-white/90 dark:text-white dark:bg-slate-800/80 placeholder-gray-400 border focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-[1px] focus:shadow-lg focus:-translate-y-[1px] ${validationErrors.username
                ? "border-red-300 focus:ring-red-500"
                : `border-slate-200 dark:border-slate-700 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-white dark:focus:ring-offset-slate-900 ${isTypingUsername ? "ring-2 ring-blue-400/40 shadow-md" : ""}`
                }`}
              aria-invalid={!!validationErrors.username}
            />
          </div>
          {validationErrors.username && (
            <div className="mt-1 text-sm text-red-600 dark:text-red-400">
              {validationErrors.username.map((err, i) => (
                <div key={i}>{err}</div>
              ))}
            </div>
          )}
        </div>

        <div className={`transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`} style={{ transitionDelay: "160ms" }}>
          <label
            htmlFor="password"
            className="text-sm font-semibold text-gray-700 dark:text-slate-200 block"
          >
            Password <span className="text-red-500">*</span>
          </label>
          <div className="relative mt-2 group">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setIsTypingPassword(true);
                if (passwordTypingTimeoutRef.current) window.clearTimeout(passwordTypingTimeoutRef.current);
                passwordTypingTimeoutRef.current = window.setTimeout(() => setIsTypingPassword(false), 300);
              }}
              placeholder="Enter your password"
              maxLength={SECURITY_CONFIG.MAX_INPUT_LENGTH.password}
              className={`block w-full px-4 py-3 pr-12 rounded-xl bg-white/90 dark:text-white dark:bg-slate-800/80 placeholder-gray-400 border focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-[1px] focus:shadow-lg focus:-translate-y-[1px] ${validationErrors.password
                ? "border-red-300 focus:ring-red-500"
                : `border-slate-200 dark:border-slate-700 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-white dark:focus:ring-offset-slate-900 ${isTypingPassword ? "ring-2 ring-blue-400/40 shadow-md" : ""}`
                }`}
              aria-invalid={!!validationErrors.password}
            />
            <span className={`pointer-events-none absolute right-10 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-blue-400/80 transition-opacity ${isTypingPassword ? "opacity-100 animate-pulse" : "opacity-0"}`}></span>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 focus:outline-none transition-transform duration-200 group-hover:scale-105 hover:scale-110 active:scale-95"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeSlashIcon className="w-5 h-5" />
              ) : (
                <EyeIcon className="w-5 h-5" />
              )}
            </button>
          </div>
          {validationErrors.password && (
            <div className="mt-1 text-sm text-red-600 dark:text-red-400">
              {validationErrors.password.map((err, i) => (
                <div key={i}>{err}</div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div
            className="flex items-start gap-3 p-4 text-sm text-red-800 dark:text-red-200 bg-gradient-to-br from-red-50 to-white dark:from-red-900/30 dark:to-red-900/10 rounded-xl border border-red-200/70 dark:border-red-800 shadow-sm ring-1 ring-red-100/60 dark:ring-red-900/30"
            role="alert"
          >
            <div className="mt-0.5">
              <ExclamationCircleIcon className="w-5 h-5 flex-shrink-0" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">
                {error || "Login failed"}
              </div>
              <div className="text-xs mt-1 text-red-600/90 dark:text-red-300/90">
                Try again or contact your administrator.
                {!isLocked[unameKey] && remainingAttempts > 0 && (
                  <span>{` You have ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`}</span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className={`transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`} style={{ transitionDelay: "240ms" }}>
          <button
            type="submit"
            disabled={isPending || isLocked[unameKey]}
            className={`w-full inline-flex items-center justify-center py-3 px-4 rounded-xl text-base font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-lg ${isPending || isLocked[unameKey]
              ? "bg-slate-400 cursor-not-allowed shadow-none"
              : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99]"
              }`}
          >
            {isPending ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Logging in...
              </div>
            ) : isLocked[unameKey] ? (
              "Account Locked"
            ) : (
              "Login"
            )}
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative">
      <div className={`w-full max-w-6xl mx-auto grid lg:grid-cols-2 overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-100 dark:border-slate-800 transition-all duration-700 ${mounted ? "opacity-100 scale-100" : "opacity-0 scale-[0.99]"}`}>
        <div className="relative hidden lg:flex items-end p-10 bg-gradient-to-br from-indigo-600 to-blue-600">
          <div className="absolute inset-0 opacity-20 animate-pulse" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, white 2px, transparent 2px)', backgroundSize: '24px 24px' }}></div>
          <div className={`relative z-10 text-white transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
            <SystemIcon className="w-48 h-48 opacity-95 drop-shadow" />
            <h1 className="mt-6 text-4xl font-extrabold leading-tight">System Authorization Review</h1>
            <p className="mt-2 text-sm text-blue-100 max-w-sm">Access review and authorization dashboard</p>
          </div>
        </div>
        <div className="p-8 md:p-12 flex items-center justify-center bg-white dark:bg-slate-900">
          {FormBlock}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
