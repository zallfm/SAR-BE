/**
 * Security Configuration
 * ISO 27001 Compliant Frontend Security Settings
 */
 
export const SECURITY_CONFIG = {
  // Session Management
  SESSION_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes inactivity
  SESSION_WARNING_MS: 5 * 60 * 1000, // 5 min warning before timeout
  TOKEN_REFRESH_THRESHOLD_MS: 5 * 60 * 1000, // Refresh token 5 min before expiry
  MAX_SESSION_DURATION_MS: 8 * 60 * 60 * 1000, // 8 hours max session
 
  // Authentication Security
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MS: 15 * 60 * 1000, // 15 minutes lockout
  PASSWORD_MIN_LENGTH: 8,
  REQUIRE_STRONG_PASSWORD: true,
 
  // Rate Limiting
  MAX_API_CALLS_PER_MINUTE: 60,
  MAX_FAILED_REQUESTS: 10,
 
  // Data Protection
  ENCRYPT_LOCALSTORAGE: true,
  CLEAR_DATA_ON_LOGOUT: true,
  SANITIZE_USER_INPUT: true,
 
  // Monitoring
  LOG_FAILED_AUTH_ATTEMPTS: true,
  LOG_SUSPICIOUS_ACTIVITY: true,
  ALERT_ON_MULTIPLE_FAILED_LOGINS: true,
 
  // Content Security Policy
  CSP_DIRECTIVES: {
    "default-src": ["*"],
    "script-src": [
      "'self'",
      "'unsafe-inline'", // Required for React development
      "'unsafe-eval'", // Required for development tools
    ],
    "style-src": [
      "'self'",
      "'unsafe-inline'", // Required for styled-components
      "https://fonts.googleapis.com",
    ],
    "font-src": ["'self'", "https://fonts.gstatic.com"],
    "img-src": ["'self'", "data:", "https:", "blob:"],
    "connect-src": ["*"],
    "media-src": ["*"],
    "object-src": ["'none'"],
    "frame-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "upgrade-insecure-requests": [],
  },
 
  // Security Headers
  SECURITY_HEADERS: {
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
  },
 
  // File Upload Security
  ALLOWED_FILE_TYPES: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf",
    "text/plain",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
 
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
 
  // Input Validation
  MAX_INPUT_LENGTH: {
    username: 50,
    password: 128,
    email: 254,
    text: 1000,
    comment: 5000,
  },
 
  // API Security
  API_TIMEOUT_MS: 30000, // 30 seconds
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
 
  // Error Handling
  LOG_ERRORS_TO_CONSOLE: process.env.NODE_ENV === "development",
  SEND_ERRORS_TO_SERVER: true,
  MASK_SENSITIVE_DATA_IN_LOGS: true,
} as const;
 
/**
 * Content Security Policy string
 */
export function getCSPString(): string {
  const directives = SECURITY_CONFIG.CSP_DIRECTIVES;
  return Object.entries(directives)
    .map(([directive, sources]) => {
      if (Array.isArray(sources)) {
        return `${directive} ${sources.join(" ")}`;
      }
      return `${directive} ${sources}`;
    })
    .join("; ");
}
 
/**
 * Apply security headers to document
 */
export function applySecurityHeaders(): void {
  // Set CSP meta tag
  const cspMeta = document.createElement("meta");
  cspMeta.setAttribute("http-equiv", "Content-Security-Policy");
  cspMeta.setAttribute("content", getCSPString());
  document.head.appendChild(cspMeta);
 
  // Set other security meta tags
  const securityMetaTags = [
    { name: "referrer", content: "strict-origin-when-cross-origin" },
    { name: "format-detection", content: "telephone=no" },
  ];
 
  securityMetaTags.forEach(({ name, content }) => {
    const meta = document.createElement("meta");
    meta.setAttribute("name", name);
    meta.setAttribute("content", content);
    document.head.appendChild(meta);
  });
}
 
/**
 * Validate environment variables for security
 */
export function validateSecurityEnvironment(): void {
  const requiredEnvVars = ["REACT_APP_API_BASE_URL"];
 
  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );
 
  if (missingVars.length > 0) {
    console.warn("Missing required environment variables:", missingVars);
  }
 
  // Validate API URL is HTTPS in production
  if (process.env.NODE_ENV === "production") {
    const apiUrl = process.env.REACT_APP_API_BASE_URL;
    if (apiUrl && !apiUrl.startsWith("https://")) {
      console.error("API URL must use HTTPS in production");
    }
  }
}
 
/**
 * Initialize security configuration
 */
export function initializeSecurity(): void {
  validateSecurityEnvironment();
  applySecurityHeaders();
 
  // Disable right-click context menu in production
  if (process.env.NODE_ENV === "production") {
    document.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    });
  }
 
  // Disable F12, Ctrl+Shift+I, Ctrl+U in production
  if (process.env.NODE_ENV === "production") {
    document.addEventListener("keydown", (e) => {
      // Disable F12
      if (e.key === "F12") {
        e.preventDefault();
      }
 
      // Disable Ctrl+Shift+I (DevTools)
      if (e.ctrlKey && e.shiftKey && e.key === "I") {
        e.preventDefault();
      }
 
      // Disable Ctrl+U (View Source)
      if (e.ctrlKey && e.key === "u") {
        e.preventDefault();
      }
    });
  }
}
 