import type { Session } from '@supabase/supabase-js';

export type { Session };

export type EventCategory =
  | 'sports'
  | 'trivia'
  | 'food_drink'
  | 'live_music'
  | 'movies'
  | 'entertainment'
  | 'general';

export interface Event {
  id: string;
  uid: string;
  summary: string;
  category: EventCategory;
  start_at: string;
  end_at: string;
  image_url: string | null;
  event_url: string | null;
  cost_type: 'free' | 'paid';
  is_recurring: boolean;
  attendee_count: number;
}

export interface NotificationPrefs {
  id: string;
  user_id: string;
  expo_push_token: string;
  categories: EventCategory[] | ['all'];
  morning_alerts: boolean;
  evening_alerts: boolean;
  is_active: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}
