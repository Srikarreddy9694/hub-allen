import { supabase } from '@/lib/supabase';
import type { Event, EventCategory } from '@/types';

const FUNCTION_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1`;

async function callEdgeFunction<T>(
  name: string,
  params: Record<string, string | number>,
): Promise<T> {
  const query = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, String(v)]),
    ),
  ).toString();

  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': process.env.EXPO_PUBLIC_SUPABASE_KEY!,
  };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  } else {
    headers['Authorization'] = `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_KEY!}`;
  }

  const res = await fetch(`${FUNCTION_URL}/${name}?${query}`, { headers });
  if (!res.ok) throw new Error(`Edge function ${name} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

function todayCST(): string {
  return new Date()
    .toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
}

export async function fetchTonightEvents(): Promise<Event[]> {
  const result = await callEdgeFunction<{ events: Event[] }>('get-events', {
    date: todayCST(),
    days: 1,
    limit: 50,
  });
  return result.events;
}

export async function fetchUpcomingEvents(
  category?: EventCategory | 'all',
  page = 0,
): Promise<Event[]> {
  const params: Record<string, string | number> = {
    date: todayCST(),
    days: 14,
    limit: 50,
  };
  if (category && category !== 'all') params.category = category;
  if (page > 0) params.offset = page * 50;

  const result = await callEdgeFunction<{ events: Event[] }>('get-events', params);
  return result.events;
}
