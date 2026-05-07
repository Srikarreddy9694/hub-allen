import { create } from 'zustand';
import { fetchTonightEvents, fetchUpcomingEvents } from '@/lib/api';
import type { Event, EventCategory } from '@/types';

interface EventsStore {
  tonightEvents: Event[];
  upcomingEvents: Event[];
  selectedCategory: EventCategory | 'all';
  isLoading: boolean;
  fetchTonight: () => Promise<void>;
  fetchUpcoming: (category?: EventCategory | 'all') => Promise<void>;
  setCategory: (category: EventCategory | 'all') => void;
}

export const useEventsStore = create<EventsStore>((set, get) => ({
  tonightEvents: [],
  upcomingEvents: [],
  selectedCategory: 'all',
  isLoading: false,

  fetchTonight: async () => {
    set({ isLoading: true });
    try {
      const events = await fetchTonightEvents();
      set({ tonightEvents: events });
    } catch (e) {
      console.error('fetchTonight error:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchUpcoming: async (category?: EventCategory | 'all') => {
    const cat = category ?? get().selectedCategory;
    set({ isLoading: true });
    try {
      const events = await fetchUpcomingEvents(cat);
      set({ upcomingEvents: events });
    } catch (e) {
      console.error('fetchUpcoming error:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  setCategory: (category) => set({ selectedCategory: category }),
}));
