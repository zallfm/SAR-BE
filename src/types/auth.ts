export interface User {
  username: string;
  name: string;
  role: 'Admin' | 'DpH' | 'System Owner';
}

export interface TokenPayload {
  sub: string;
  role: User['role'];
  name: string;
  iat?: number;
  exp?: number;
}
