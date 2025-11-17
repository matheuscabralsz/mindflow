export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  reminder_enabled: boolean;
  reminder_time: string;
  theme: 'light' | 'dark';
  created_at: string;
  updated_at: string;
}
