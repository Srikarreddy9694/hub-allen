import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import { useAttendanceStore } from '@/stores/attendanceStore';
import NotificationPrefs from '@/components/NotificationPrefs';
import LoginSheet from '@/components/LoginSheet';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/colors';
import { Fonts, FontSizes } from '@/constants/typography';
import { Radius, Spacing } from '@/constants/spacing';
import { Shadows } from '@/constants/shadows';
import type { Event } from '@/types';

function initials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  }
  return email[0]?.toUpperCase() ?? '?';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Chicago',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Chicago',
  });
}

function SavedEventRow({ event }: { event: Event }) {
  return (
    <View style={styles.savedRow}>
      <View style={styles.savedInfo}>
        <Text style={styles.savedTitle} numberOfLines={1}>{event.summary}</Text>
        <Text style={styles.savedMeta}>{formatDate(event.start_at)} · {formatTime(event.start_at)}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const openLoginSheet = useAuthStore((s) => s.openLoginSheet);
  const signOut = useAuthStore((s) => s.signOut);
  const savedUids = useAttendanceStore((s) => s.savedUids);

  const [savedEvents, setSavedEvents] = useState<Event[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadSavedEvents(user.id);
    } else {
      setSavedEvents([]);
    }
  }, [user?.id, savedUids]);

  async function loadSavedEvents(userId: string) {
    setLoadingSaved(true);
    const uids = [...savedUids];
    if (uids.length === 0) {
      setSavedEvents([]);
      setLoadingSaved(false);
      return;
    }
    const { data } = await supabase
      .from('events')
      .select('id,uid,summary,category,start_at,end_at,image_url,event_url,cost_type,is_recurring')
      .in('uid', uids)
      .eq('is_active', true)
      .gte('start_at', new Date().toISOString())
      .order('start_at', { ascending: true });

    setSavedEvents(
      (data ?? []).map((e) => ({ ...e, attendee_count: 0 })) as Event[],
    );
    setLoadingSaved(false);
  }

  function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <LoginSheet />
        <ScrollView contentContainerStyle={styles.loggedOutContainer}>
          <Image
            source={require('../../assets/images/hub-logo.png')}
            style={styles.loggedOutLogo}
            resizeMode="contain"
          />
          <Text style={styles.loggedOutHeading}>Your Hub, personalised</Text>
          <Text style={styles.loggedOutSub}>
            Sign in to save events, track attendance and get personalised notifications.
          </Text>
          <TouchableOpacity
            style={styles.signInBtn}
            onPress={() => openLoginSheet()}
            activeOpacity={0.85}
          >
            <Text style={styles.signInBtnLabel}>Sign in / Create account</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LoginSheet />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + name */}
        <View style={styles.avatarSection}>
          {user.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>{initials(user.full_name, user.email)}</Text>
            </View>
          )}
          <Text style={styles.userName}>{user.full_name ?? user.email}</Text>
          {user.full_name && (
            <Text style={styles.userEmail}>{user.email}</Text>
          )}
        </View>

        {/* Saved events */}
        {savedEvents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SAVED EVENTS</Text>
            {savedEvents.map((ev) => (
              <SavedEventRow key={ev.uid} event={ev} />
            ))}
          </View>
        )}

        {savedEvents.length === 0 && !loadingSaved && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SAVED EVENTS</Text>
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No upcoming saved events</Text>
            </View>
          </View>
        )}

        {/* Notification preferences */}
        <NotificationPrefs />

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.75}>
          <Text style={styles.signOutLabel}>Sign out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  scroll: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Logged-out state
  loggedOutContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: 60,
  },
  loggedOutLogo: {
    height: 40,
    width: 180,
    marginBottom: Spacing.xl,
  },
  loggedOutHeading: {
    fontFamily: Fonts.displayBold,
    fontSize: FontSizes.h2,
    color: Colors.textDark,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  loggedOutSub: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textMid,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  signInBtn: {
    width: '100%',
    backgroundColor: Colors.hubGreen,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signInBtnLabel: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.lg,
    color: Colors.white,
  },

  // Avatar section
  avatarSection: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.hubGreen,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.hubGold,
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.hubGold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  avatarInitials: {
    fontFamily: Fonts.displayBold,
    fontSize: FontSizes.h2,
    color: Colors.white,
  },
  userName: {
    fontFamily: Fonts.displayBold,
    fontSize: FontSizes.h3,
    color: Colors.white,
    marginBottom: 2,
  },
  userEmail: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.hubGoldLight,
  },

  // Section
  section: {
    marginTop: Spacing.lg,
  },
  sectionLabel: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.xs,
    color: Colors.textLight,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.base,
  },

  // Saved event rows
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.base,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  savedInfo: {
    flex: 1,
  },
  savedTitle: {
    fontFamily: Fonts.bodyMed,
    fontSize: FontSizes.md,
    color: Colors.textDark,
  },
  savedMeta: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textLight,
    marginTop: 2,
  },

  // Empty saved
  emptyCard: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textLight,
  },

  // Sign out
  signOutBtn: {
    marginTop: Spacing.xl,
    marginHorizontal: Spacing.base,
    borderRadius: Radius.md,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  signOutLabel: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.md,
    color: Colors.textMid,
  },
});
