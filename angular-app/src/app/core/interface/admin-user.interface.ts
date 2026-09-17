export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'normal_user' | 'admin';
  status: 'active' | 'blocked';
  emailConfirmed: number;
  createdAt: string;
}
