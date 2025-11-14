/**
 * Optimized Login Page Component
 * Performance & Clean Code Improvements
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { User } from '../../../../../types';
import { SystemIcon } from '../../../icons/SystemIcon';
import { EyeIcon } from '../../../icons/EyeIcon';
import { EyeSlashIcon } from '../../../icons/EyeSlashIcon';
import { ExclamationCircleIcon } from '../../../icons/ExclamationCircleIcon';
import { useLogging } from '../../../../hooks/useLogging';
import { sessionManager } from '../../../../services/sessionManager';
import { authService } from '../../../../services/authService';
import { SecurityValidator } from '../../../../services/securityValidator';
import { AuditLogger } from '../../../../services/auditLoggerOptimized';
import { AuditAction } from '../../../../constants/auditActions';
import { SECURITY_CONFIG, SECURITY_CONSTANTS } from '../../../../config/security';
import { debounce, UserDataManager } from '../../../../utils/performanceOptimizations';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

interface ValidationState {
  username?: string[];
  password?: string[];
}

interface LoginState {
  username: string;
  password: string;
  error: string;
  showPassword: boolean;
  isLoading: boolean;
  validationErrors: ValidationState;
  failedAttempts: Record<string, number>;
  isLocked: Record<string, boolean>;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [state, setState] = useState<LoginState>({
    username: '',
    password: '',
    error: '',
    showPassword: false,
    isLoading: false,
    validationErrors: {},
    failedAttempts: {},
    isLocked: {}
  });

  const { logAuthentication, logSecurity } = useLogging();

  // Memoized validation functions
  const validateUsername = useCallback((username: string) => {
    return SecurityValidator.validateUsername(username);
  }, []);

  const validatePassword = useCallback((password: string) => {
    return SecurityValidator.validatePassword(password);
  }, []);

  // Debounced validation to prevent excessive re-renders
  const debouncedValidation = useMemo(
    () => debounce((username: string, password: string) => {
      const usernameValidation = validateUsername(username);
      const passwordValidation = validatePassword(password);

      setState(prev => ({
        ...prev,
        validationErrors: {
          username: usernameValidation.errors,
          password: passwordValidation.errors
        }
      }));
    }, SECURITY_CONSTANTS.DEBOUNCE_DELAY_MS),
    [validateUsername, validatePassword]
  );

  // Initialize security on component mount
  useEffect(() => {
    // Check if user is already authenticated
    if (authService.isAuthenticated()) {
      const user = authService.getCurrentUser();
      if (user) {
        onLoginSuccess(user);
        return;
      }
    }

    // Initialize audit logger
    AuditLogger.initialize();

    // Cleanup on unmount
    return () => {
      AuditLogger.cleanup();
    };
  }, [onLoginSuccess]);

  // Handle input changes with debounced validation
  const handleInputChange = useCallback((field: 'username' | 'password', value: string) => {
    setState(prev => ({ ...prev, [field]: value, error: '' }));

    // Debounced validation
    if (field === 'username') {
      debouncedValidation(value, state.password);
    } else {
      debouncedValidation(state.username, value);
    }
  }, [state.username, state.password, debouncedValidation]);

  // Optimized login handler
  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setState(prev => ({
      ...prev,
      error: '',
      validationErrors: {},
      isLoading: true
    }));

    try {
      // Check if account is locked
      if (state.isLocked[state.username]) {
        setState(prev => ({
          ...prev,
          error: 'Account is temporarily locked due to multiple failed attempts. Please try again later.'
        }));

        AuditLogger.logWarning(AuditAction.ACCOUNT_LOCKED, {
          userName: state.username,
          description: 'Login attempt on locked account'
        });
        return;
      }

      // Validate input
      const usernameValidation = validateUsername(state.username);
      const passwordValidation = validatePassword(state.password);

      if (!usernameValidation.isValid || !passwordValidation.isValid) {
        setState(prev => ({
          ...prev,
          validationErrors: {
            username: usernameValidation.errors,
            password: passwordValidation.errors
          },
          error: 'Please correct the validation errors below.'
        }));
        return;
      }

      // Attempt login with secure service
      const authResponse = await authService.login({
        username: usernameValidation.sanitizedValue,
        password: passwordValidation.sanitizedValue
      });

      // Reset failed attempts on successful login
      setState(prev => ({
        ...prev,
        failedAttempts: { ...prev.failedAttempts, [state.username]: 0 },
        isLocked: { ...prev.isLocked, [state.username]: false }
      }));

      // Create session
      sessionManager.createSession({
        userId: authResponse.user.username,
        username: authResponse.user.username,
        role: authResponse.user.role,
        name: authResponse.user.name,
        ip: '127.0.0.1',
        userAgent: navigator.userAgent,
      });

      // Log successful login
      logAuthentication('login_success', {
        username: authResponse.user.username,
        role: authResponse.user.role,
        name: authResponse.user.name,
        ip: '127.0.0.1',
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });

      onLoginSuccess(authResponse.user);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      const currentAttempts = (state.failedAttempts[state.username] || 0) + 1;

      // Update state with error and failed attempts
      setState(prev => ({
        ...prev,
        error: errorMessage,
        failedAttempts: { ...prev.failedAttempts, [state.username]: currentAttempts }
      }));

      // Log failed login attempt
      logAuthentication('login_failed', {
        username: state.username,
        reason: 'invalid_credentials',
        attemptNumber: currentAttempts,
        ip: '127.0.0.1',
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });

      // Lock account after max attempts
      if (currentAttempts >= SECURITY_CONSTANTS.MAX_LOGIN_ATTEMPTS) {
        setState(prev => ({
          ...prev,
          isLocked: { ...prev.isLocked, [state.username]: true }
        }));

        // Set auto-unlock timer
        setTimeout(() => {
          setState(prev => ({
            ...prev,
            isLocked: { ...prev.isLocked, [state.username]: false },
            failedAttempts: { ...prev.failedAttempts, [state.username]: 0 }
          }));
        }, SECURITY_CONSTANTS.LOCKOUT_DURATION_MS);

        AuditLogger.logWarning(AuditAction.ACCOUNT_LOCKED, {
          userName: state.username,
          description: `Account locked after ${currentAttempts} failed attempts`
        });
      }

      // Log suspicious activity for multiple failed attempts
      if (currentAttempts >= SECURITY_CONSTANTS.SUSPICIOUS_ATTEMPT_THRESHOLD) {
        logSecurity('multiple_failed_login_attempts', {
          username: state.username,
          attemptCount: currentAttempts,
          ip: '127.0.0.1',
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }, 'Warning');
      }

      // Log potential brute force attack
      if (currentAttempts >= SECURITY_CONSTANTS.BRUTE_FORCE_THRESHOLD) {
        logSecurity('potential_brute_force_attack', {
          username: state.username,
          attemptCount: currentAttempts,
          ip: '127.0.0.1',
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }, 'Error');
      }

    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.username, state.password, state.failedAttempts, state.isLocked, validateUsername, validatePassword, logAuthentication, logSecurity, onLoginSuccess]);

  // Memoized input handlers
  const handleUsernameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleInputChange('username', e.target.value);
  }, [handleInputChange]);

  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleInputChange('password', e.target.value);
  }, [handleInputChange]);

  const togglePasswordVisibility = useCallback(() => {
    setState(prev => ({ ...prev, showPassword: !prev.showPassword }));
  }, []);

  // Memoized computed values
  const isSubmitDisabled = useMemo(() => {
    return state.isLoading || state.isLocked[state.username];
  }, [state.isLoading, state.isLocked, state.username]);

  const submitButtonText = useMemo(() => {
    if (state.isLoading) return 'Logging in...';
    if (state.isLocked[state.username]) return 'Account Locked';
    return 'Login';
  }, [state.isLoading, state.isLocked, state.username]);

  return (
    <div className="flex items-center justify-center min-h-screen p-4 dark:bg-slate-950">
      <div className="w-full max-w-5xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl grid md:grid-cols-2 overflow-hidden">
        {/* Left Panel: Branding */}
        <div className="hidden md:flex flex-col items-center justify-center p-12 bg-stone-50 dark:bg-slate-800 text-center">
          <SystemIcon className="w-48 h-48" />
          <h1 className="mt-8 text-4xl font-bold tracking-wider text-[#0F3460] dark:text-white">
            SYSTEM
            <br />
            AUTHORIZATION
            <br />
            REVIEW
          </h1>
        </div>

        {/* Right Panel: Login Form */}
        <div className="p-8 md:p-12 flex flex-col justify-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Login to Account</h2>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Please enter username and password to continue
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div>
              <label
                htmlFor="username"
                className="text-sm font-semibold text-gray-700 dark:text-gray-200 block"
              >
                Username <span className="text-red-500">*</span>
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={state.username}
                onChange={handleUsernameChange}
                placeholder="Enter the username"
                maxLength={SECURITY_CONFIG.MAX_INPUT_LENGTH.username}
                className={`mt-2 block w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border rounded-lg placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 !dark:text-white focus:outline-none focus:ring-2 focus:border-transparent transition ${state.validationErrors.username
                  ? 'border-red-300 dark:border-red-600 focus:ring-red-500'
                  : 'border-gray-300 dark:border-slate-600 focus:ring-blue-500'
                  }`}
              />
              {state.validationErrors.username && (
                <div className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {state.validationErrors.username.map((error, index) => (
                    <div key={index}>{error}</div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="text-sm font-semibold text-gray-700 dark:text-gray-200 block"
              >
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-2">
                <input
                  id="password"
                  name="password"
                  type={state.showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={state.password}
                  onChange={handlePasswordChange}
                  placeholder="Enter your password"
                  maxLength={SECURITY_CONFIG.MAX_INPUT_LENGTH.password}
                  className={`block w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border rounded-lg placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:border-transparent transition ${state.validationErrors.password
                    ? 'border-red-300 dark:border-red-600 focus:ring-red-500'
                    : 'border-gray-300 dark:border-slate-600 focus:ring-blue-500'
                    }`}
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
                  aria-label={state.showPassword ? 'Hide password' : 'Show password'}
                >
                  {state.showPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
              {state.validationErrors.password && (
                <div className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {state.validationErrors.password.map((error, index) => (
                    <div key={index}>{error}</div>
                  ))}
                </div>
              )}
            </div>

            {state.error && (
              <div className="flex items-center p-4 text-sm text-red-700 dark:text-red-200 bg-red-100 dark:bg-red-900/30 rounded-lg border border-red-300 dark:border-red-800" role="alert">
                <ExclamationCircleIcon className="w-5 h-5 mr-3 flex-shrink-0" />
                <span className="font-medium">{state.error}</span>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isSubmitDisabled}
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform transform ${isSubmitDisabled
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 hover:scale-105'
                  }`}
              >
                {state.isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {submitButtonText}
                  </div>
                ) : (
                  submitButtonText
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
