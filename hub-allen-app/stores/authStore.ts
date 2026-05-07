import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Session, UserProfile } from '@/types';

interface AuthStore {
  session: Session | null;
  user: UserProfile | null;
  isLoading: boolean;
  loginSheetVisible: boolean;
  loginSheetOnSuccess: (() => void) | null;
  setSession: (session: Session | null) => void;
  openLoginSheet: (onSuccess?: () => void) => void;
  closeLoginSheet: () => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  user: null,
  isLoading: true,
  loginSheetVisible: false,
  loginSheetOnSuccess: null,

  setSession: (session) => {
    if (session) {
      const meta = session.user?.user_metadata ?? {};
      set({
        session,
        user: {
          id: session.user.id,
          email: session.user.email ?? '',
          full_name: (meta.full_name as string | null) ?? null,
          avatar_url: (meta.avatar_url as string | null) ?? null,
        },
        isLoading: false,
      });
    } else {
      set({ session: null, user: null, isLoading: false });
    }
  },

  openLoginSheet: (onSuccess) =>
    set({ loginSheetVisible: true, loginSheetOnSuccess: onSuccess ?? null }),

  closeLoginSheet: () =>
    set({ loginSheetVisible: false, loginSheetOnSuccess: null }),

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, loginSheetVisible: false });
  },
}));
