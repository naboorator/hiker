export type UserRole = 'normal_user' | 'admin';
export type UserStatus = 'active' | 'blocked' | 'deleted';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}
