export const env = {
  PORT: Number(process.env.PORT ?? 3000),
  NODE_ENV: process.env.NODE_ENV ?? "development",
  DB_URL: process.env.DB_URL ?? "localhost",
  DB_PORT: Number(process.env.DB_PORT ?? 5432),
  DB_USER: process.env.DB_USER ?? "mssql",
  DB_NAME: process.env.DB_NAME ?? "",
  DB_PASSWORD: process.env.DB_PASSWORD ?? "",

  JWT_SECRET: process.env.JWT_SECRET ?? "changeme",
  TOKEN_EXPIRES_IN: Number(process.env.TOKEN_EXPIRES_IN ?? 9000),

  RATE_LIMIT_PER_MINUTE: Number(process.env.RATE_LIMIT_PER_MINUTE ?? 60),
  LOCKOUT_MAX_ATTEMPTS: Number(process.env.LOCKOUT_MAX_ATTEMPTS ?? 5),
  LOCKOUT_WINDOW_MS: Number(process.env.LOCKOUT_WINDOW_MS ?? 15 * 60 * 1000),

  MOCK_USER_ADMIN_USERNAME: process.env.MOCK_USER_ADMIN_USERNAME ?? "admin21",
  MOCK_USER_ADMIN_PASSWORD:
    process.env.MOCK_USER_ADMIN_PASSWORD ?? "password123212",
  MOCK_USER_ADMIN_NAME: process.env.MOCK_USER_ADMIN_NAME ?? "Admin User",
  MOCK_USER_ADMIN_ROLE: process.env.MOCK_USER_ADMIN_ROLE ?? "Admin",
} as const;
