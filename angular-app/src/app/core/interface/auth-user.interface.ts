export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'normal_user' | 'admin';
}
