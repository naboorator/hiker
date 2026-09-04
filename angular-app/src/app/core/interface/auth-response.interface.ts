import type { AuthUser } from './auth-user.interface';

export interface AuthResponse {
  token: string;
  user: AuthUser;
}
