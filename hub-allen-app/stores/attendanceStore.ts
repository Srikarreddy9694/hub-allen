import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Event } from '@/types';

interface AttendanceStore {
  attendingUids: Set<string>;
  savedUids: Set<string>;
  loadUserData: (userId: string) => Promise<void>;
  toggleAttendance: (eventUid: string, event: Event) => Promise<void>;
  toggleSaved: (eventUid: string) => Promise<void>;
}

export const useAttendanceStore = create<AttendanceStore>((set, get) => ({
  attendingUids: new Set(),
  savedUids: new Set(),

  loadUserData: async (userId) => {
    const [attendRes, savedRes] = await Promise.all([
      supabase
        .from('event_attendees')
        .select('event_uid')
        .eq('user_id', userId),
      supabase
        .from('saved_events')
        .select('event_uid')
        .eq('user_id', userId),
    ]);

    set({
      attendingUids: new Set((attendRes.data ?? []).map((r) => r.event_uid)),
      savedUids: new Set((savedRes.data ?? []).map((r) => r.event_uid)),
    });
  },

  toggleAttendance: async (eventUid, _event) => {
    const { attendingUids } = get();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const userId = session.user.id;

    if (attendingUids.has(eventUid)) {
      await supabase
        .from('event_attendees')
        .delete()
        .eq('user_id', userId)
        .eq('event_uid', eventUid);

      set((s) => {
        const next = new Set(s.attendingUids);
        next.delete(eventUid);
        return { attendingUids: next };
      });
    } else {
      await supabase
        .from('event_attendees')
        .insert({ user_id: userId, event_uid: eventUid });

      set((s) => ({
        attendingUids: new Set([...s.attendingUids, eventUid]),
      }));
    }
  },

  toggleSaved: async (eventUid) => {
    const { savedUids } = get();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const userId = session.user.id;

    if (savedUids.has(eventUid)) {
      await supabase
        .from('saved_events')
        .delete()
        .eq('user_id', userId)
        .eq('event_uid', eventUid);

      set((s) => {
        const next = new Set(s.savedUids);
        next.delete(eventUid);
        return { savedUids: next };
      });
    } else {
      await supabase
        .from('saved_events')
        .insert({ user_id: userId, event_uid: eventUid });

      set((s) => ({
        savedUids: new Set([...s.savedUids, eventUid]),
      }));
    }
  },
}));
