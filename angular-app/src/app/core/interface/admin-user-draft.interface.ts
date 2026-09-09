export interface AdminUserDraft {
  name: string;
  email: string;
  role: 'normal_user' | 'admin';
}
