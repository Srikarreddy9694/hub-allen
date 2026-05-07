import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Calendar from 'expo-calendar';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useAttendanceStore } from '@/stores/attendanceStore';
import CategoryBadge from '@/components/CategoryBadge';
import AttendButton from '@/components/AttendButton';
import InviteModal from '@/components/InviteModal';
import { Colors } from '@/constants/colors';
import { Fonts, FontSizes } from '@/constants/typography';
import { Radius, Spacing } from '@/constants/spacing';
import type { Event, EventCategory } from '@/types';

const CATEGORY_EMOJI: Record<EventCategory, string> = {
  sports:        '🏆',
  trivia:        '🧠',
  food_drink:    '🍻',
  live_music:    '🎸',
  movies:        '🎬',
  entertainment: '🎉',
  general:       '⭐',
};

const CATEGORY_GRADIENT: Record<EventCategory, [string, string]> = {
  sports:        Colors.gradSports,
  trivia:        Colors.gradTrivia,
  food_drink:    Colors.gradTaco,
  live_music:    Colors.gradMusic,
  movies:        Colors.gradMovie,
  entertainment: Colors.gradDJ,
  general:       Colors.gradSports,
};

const RESTAURANTS = [
  { name: 'Crave', emoji: '🍔' },
  { name: 'Local Smoke', emoji: '🔥' },
  { name: 'Macho Taco', emoji: '🌮' },
  { name: 'Amore Pizza', emoji: '🍕' },
  { name: 'Clubhouse', emoji: '🥂' },
  { name: 'Super Freeze', emoji: '🍦' },
  { name: 'The Spout', emoji: '🍺' },
  { name: 'The Spoke', emoji: '🎱' },
];

type EventWithDesc = Event & { description: string | null };

function stripHtml(html: string | null): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
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

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [event, setEvent] = useState<EventWithDesc | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteVisible, setInviteVisible] = useState(false);

  const session = useAuthStore((s) => s.session);
  const openLoginSheet = useAuthStore((s) => s.openLoginSheet);
  const attendingUids = useAttendanceStore((s) => s.attendingUids);
  const savedUids = useAttendanceStore((s) => s.savedUids);
  const toggleSaved = useAttendanceStore((s) => s.toggleSaved);

  const prevAttendingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (id) loadEvent(id);
  }, [id]);

  // Detect when user newly joins this event and show InviteModal
  useEffect(() => {
    if (!event) return;
    const wasAttending = prevAttendingRef.current.has(event.uid);
    const isNowAttending = attendingUids.has(event.uid);
    if (!wasAttending && isNowAttending) {
      setInviteVisible(true);
    }
    prevAttendingRef.current = new Set(attendingUids);
  }, [attendingUids, event]);

  async function loadEvent(eventId: string) {
    const { data, error } = await supabase
      .from('events')
      .select('id,uid,summary,description,category,start_at,end_at,image_url,event_url,cost_type,is_recurring')
      .eq('id', eventId)
      .single();

    if (error || !data) {
      setLoading(false);
      return;
    }

    setEvent({ ...data, attendee_count: 0 } as EventWithDesc);
    setLoading(false);
  }

  async function handleAddToCalendar() {
    if (!event) return;
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Calendar access is required to add this event.');
        return;
      }
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const defaultCal = calendars.find((c) => c.allowsModifications) ?? calendars[0];
      if (!defaultCal) {
        Alert.alert('No calendar found', 'Could not find a writable calendar.');
        return;
      }
      await Calendar.createEventAsync(defaultCal.id, {
        title: event.summary,
        startDate: new Date(event.start_at),
        endDate: new Date(event.end_at),
        location: 'The HUB Allen, Allen, TX',
        notes: event.description ?? undefined,
      });
      Alert.alert('Added!', 'Event added to your calendar.');
    } catch {
      Alert.alert('Error', 'Could not add event to calendar.');
    }
  }

  function handleDirections() {
    const url =
      Platform.OS === 'ios'
        ? 'maps://maps.apple.com/?q=The+HUB+Allen&ll=33.0837,-96.6640'
        : 'geo:33.0837,-96.6640?q=The+HUB+Allen';
    Linking.openURL(url);
  }

  if (loading || !event) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <TouchableOpacity style={[styles.backBtn, { top: insets.top + 10 }]} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.loadingText}>{loading ? 'Loading…' : 'Event not found'}</Text>
      </View>
    );
  }

  const isSaved = savedUids.has(event.uid);
  const gradColors = CATEGORY_GRADIENT[event.category] ?? Colors.gradSports;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 48 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          {event.image_url ? (
            <Image
              source={{ uri: event.image_url }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
            />
          ) : (
            <LinearGradient colors={gradColors} style={StyleSheet.absoluteFill}>
              <View style={styles.heroFallbackEmoji}>
                <Text style={styles.heroEmoji}>{CATEGORY_EMOJI[event.category]}</Text>
              </View>
            </LinearGradient>
          )}

          {/* Fade overlay — hero blends into cream */}
          <LinearGradient
            colors={['rgba(0,0,0,0.15)', Colors.cream]}
            style={StyleSheet.absoluteFill}
          />

          {/* Back button */}
          <TouchableOpacity
            style={[styles.backBtn, { top: insets.top + 10 }]}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>

          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveBtn, { top: insets.top + 10 }]}
            onPress={() => {
              if (!session) {
                openLoginSheet(() => toggleSaved(event.uid));
                return;
              }
              toggleSaved(event.uid);
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.saveIcon, isSaved && styles.saveIconActive]}>
              {isSaved ? '♥' : '♡'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Badges */}
          <View style={styles.badgeRow}>
            <CategoryBadge category={event.category} />
            {event.cost_type === 'free' && (
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>FREE</Text>
              </View>
            )}
          </View>

          {/* Title */}
          <Text style={styles.title}>{event.summary}</Text>

          {/* Meta rows */}
          <View style={styles.metaRows}>
            <View style={styles.metaRow}>
              <Text style={styles.metaIcon}>📅</Text>
              <Text style={styles.metaText}>{formatDate(event.start_at)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaIcon}>🕖</Text>
              <Text style={styles.metaText}>
                {formatTime(event.start_at)} – {formatTime(event.end_at)}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaIcon}>📍</Text>
              <Text style={styles.metaText}>The HUB Allen · Allen, TX</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Attendees row */}
          <View style={styles.attendeesRow}>
            <View style={styles.attendeesLeft}>
              <Text style={styles.attendeeCount}>
                {attendingUids.has(event.uid) ? "You're going!" : 'Join the crew'}
              </Text>
              <Text style={styles.attendeeSub}>Be part of the crew</Text>
            </View>
            <AttendButton event={event} size="large" />
          </View>

          <View style={styles.divider} />

          {/* Description */}
          {event.description ? (
            <Text style={styles.description}>{stripHtml(event.description)}</Text>
          ) : (
            <Text style={styles.description}>
              Join us at The HUB Allen for {event.summary}. All ages welcome!
            </Text>
          )}

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleDirections} activeOpacity={0.8}>
              <Text style={styles.actionBtnIcon}>📍</Text>
              <Text style={styles.actionBtnLabel}>DIRECTIONS</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleAddToCalendar} activeOpacity={0.8}>
              <Text style={styles.actionBtnIcon}>📅</Text>
              <Text style={styles.actionBtnLabel}>CALENDAR</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setInviteVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnIcon}>📤</Text>
              <Text style={styles.actionBtnLabel}>SHARE</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* Pair it with dinner */}
          <Text style={styles.diningHeader}>PAIR IT WITH DINNER</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.restaurantList}
          >
            {RESTAURANTS.map((r) => (
              <View key={r.name} style={styles.restaurantChip}>
                <Text style={styles.restaurantEmoji}>{r.emoji}</Text>
                <Text style={styles.restaurantName}>{r.name}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      <InviteModal
        visible={inviteVisible}
        event={event}
        onClose={() => setInviteVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 48,
  },

  // Hero
  hero: {
    height: 200,
    backgroundColor: Colors.hubDark,
  },
  heroFallbackEmoji: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmoji: {
    fontSize: 60,
  },
  backBtn: {
    position: 'absolute',
    left: Spacing.base,
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: Fonts.bodySemi,
  },
  saveBtn: {
    position: 'absolute',
    right: Spacing.base,
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveIcon: {
    color: Colors.white,
    fontSize: 16,
  },
  saveIconActive: {
    color: Colors.hubGold,
  },

  // Content
  content: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
    marginTop: 2,
  },
  freeBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: Colors.sportsGreen,
  },
  freeBadgeText: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.xs,
    color: Colors.sportsText,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  title: {
    fontFamily: Fonts.displayBold,
    fontSize: FontSizes.h1,
    color: Colors.textDark,
    lineHeight: 28,
    marginBottom: Spacing.base,
  },

  // Meta
  metaRows: {
    gap: 6,
    marginBottom: Spacing.base,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  metaIcon: {
    fontSize: 14,
    width: 18,
    textAlign: 'center',
  },
  metaText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xl,
    color: Colors.textMid,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.base,
  },

  // Attendees
  attendeesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.base,
  },
  attendeesLeft: {},
  attendeeCount: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.xl,
    color: Colors.textDark,
  },
  attendeeSub: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textLight,
    marginTop: 2,
  },

  // Description
  description: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textMid,
    lineHeight: 20,
    marginBottom: Spacing.base,
  },

  // Action buttons
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: Colors.creamDark,
    borderRadius: 13,
    paddingVertical: 11,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    gap: 4,
  },
  actionBtnIcon: {
    fontSize: 18,
  },
  actionBtnLabel: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.xs,
    color: Colors.textMid,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  // Dining strip
  diningHeader: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.sm,
    color: Colors.textLight,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  restaurantList: {
    gap: Spacing.sm,
    paddingBottom: 4,
  },
  restaurantChip: {
    backgroundColor: Colors.creamDark,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  restaurantEmoji: {
    fontSize: 16,
  },
  restaurantName: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.base,
    color: Colors.textDark,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textLight,
  },
});
