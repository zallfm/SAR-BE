export interface User {
  username: string;
  name: string;
  role: 'ADMINISTRATOR' | 'DPH' | 'SO';
  divisionId: number;
  noreg: string;
}

export interface TokenPayload {
  sub: string;
  role: User['role'];
  name: string;
  iat?: number;
  exp?: number;
}
