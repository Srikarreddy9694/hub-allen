import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Colors } from '@/constants/colors';

export default function AuthCallback() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const loginSheetOnSuccess = useAuthStore((s) => s.loginSheetOnSuccess);
  const closeLoginSheet = useAuthStore((s) => s.closeLoginSheet);

  useEffect(() => {
    const url = Linking.getLinkingURL();
    if (url) handleUrl(url);

    const sub = Linking.addEventListener('url', ({ url: u }) => handleUrl(u));
    return () => sub.remove();
  }, []);

  async function handleUrl(url: string) {
    try {
      const parsed = Linking.parse(url);
      const params = parsed.queryParams ?? {};

      const code = params.code as string | undefined;
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error && data.session) {
          setSession(data.session);
          loginSheetOnSuccess?.();
          closeLoginSheet();
        }
      }
    } catch (e) {
      console.error('Auth callback error:', e);
    } finally {
      router.replace('/(tabs)');
    }
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.hubGreen} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
