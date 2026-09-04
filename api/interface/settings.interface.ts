export interface Settings {
  userId: string;
  appName: string;
  ownerName: string;
}

export type SettingsInput = Omit<Settings, 'userId'>;
