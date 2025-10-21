import { env } from '../../config/env';
import type { User } from '../../types/auth.js';

type InternalUser = User & { password: string };

const MOCK_USERS: InternalUser[] = [
  {
    username: env.MOCK_USER_ADMIN_USERNAME,
    password: env.MOCK_USER_ADMIN_PASSWORD,
    name: env.MOCK_USER_ADMIN_NAME,
    role: env.MOCK_USER_ADMIN_ROLE as User['role']
  }
  // Tambahkan user lain via env atau hard-code untuk DEV (hindari di prod)
];

export const userRepository = {
  async findByUsername(username: string): Promise<InternalUser | null> {
    const u = MOCK_USERS.find(u => u.username === username);
    return u ?? null;
  }
};
