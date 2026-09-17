export interface RegisterDraft {
  name: string;
  email: string;
  password: string;
  repeatPassword: string;
  language?: 'en' | 'si';
}
