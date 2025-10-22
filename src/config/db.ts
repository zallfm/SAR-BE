import { env } from "./env";

export const dbConfig = {
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  server: env.DB_URL,
  database: env.DB_NAME,
  port: env.DB_PORT,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};
