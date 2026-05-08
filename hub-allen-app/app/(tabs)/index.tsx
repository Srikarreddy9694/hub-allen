import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEventsStore } from '@/stores/eventsStore';
import { useAttendanceStore } from '@/stores/attendanceStore';
import AttendButton from '@/components/AttendButton';
import LoginSheet from '@/components/LoginSheet';
import InviteModal from '@/components/InviteModal';
import { Colors } from '@/constants/colors';
import { Fonts, FontSizes } from '@/constants/typography';
import { Radius, Spacing } from '@/constants/spacing';
import { Shadows } from '@/constants/shadows';
import type { Event, EventCategory } from '@/types';

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORY_GRADIENT: Record<EventCategory, [string, string]> = {
  sports:        Colors.gradSports,
  trivia:        Colors.gradTrivia,
  food_drink:    Colors.gradTaco,
  live_music:    Colors.gradMusic,
  movies:        Colors.gradMovie,
  entertainment: Colors.gradDJ,
  general:       ['#1A3622', '#0B1D13'],
};

const CATEGORY_EMOJI: Record<EventCategory, string> = {
  sports:        '🏆',
  trivia:        '🧠',
  food_drink:    '🌮',
  live_music:    '🎵',
  movies:        '🎬',
  entertainment: '🎉',
  general:       '📅',
};

const RESTAURANTS: { name: string; image: ReturnType<typeof require> }[] = [
  { name: 'Crave', image: require('../../assets/restaurants/crave.jpg') },
  { name: 'Local Smoke', image: require('../../assets/restaurants/localsmoke.jpg') },
  { name: 'Macho Taco', image: require('../../assets/restaurants/macho.jpg') },
  { name: 'Amore Pizza', image: require('../../assets/restaurants/amore.jpg') },
  { name: 'Clubhouse', image: require('../../assets/restaurants/clubhouse.jpg') },
  { name: 'Super Freeze', image: require('../../assets/restaurants/superfreeze.jpg') },
  { name: 'The Spout', image: require('../../assets/restaurants/spout.jpg') },
  { name: 'The Spoke', image: require('../../assets/restaurants/spoke.jpg') },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Chicago',
  });
}

function formatHeaderDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Chicago',
  });
}

function getDayLabel(iso: string): string {
  const dow = new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    timeZone: 'America/Chicago',
  }).toUpperCase();
  return dow.slice(0, 3) + 'S'; // "MONDAYS" style
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FeaturedEventCard({ event }: { event: Event }) {
  const router = useRouter();
  const grad = CATEGORY_GRADIENT[event.category] ?? CATEGORY_GRADIENT.general;

  return (
    <TouchableOpacity
      style={styles.featured}
      onPress={() => router.push(`/event/${event.id}`)}
      activeOpacity={0.9}
    >
      {/* Hero */}
      <View style={styles.featuredHero}>
        {event.image_url ? (
          <ExpoImage
            source={{ uri: event.image_url }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            placeholder={{ blurhash: 'L25##O00xus.00WB%Ma}00of~qt7' }}
          />
        ) : (
          <LinearGradient colors={grad} style={StyleSheet.absoluteFill} />
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.55)']}
          locations={[0.35, 1]}
          style={StyleSheet.absoluteFill}
        />
        {/* Featured badge */}
        <View style={styles.featuredBadge}>
          <Text style={styles.featuredBadgeText}>⭐ FEATURED</Text>
        </View>
        {/* Time badge */}
        <View style={styles.timeBadge}>
          <Text style={styles.timeBadgeText}>{formatTime(event.start_at)}</Text>
        </View>
      </View>

      {/* Body */}
      <View style={styles.featuredBody}>
        <Text style={styles.featuredCategory}>
          {event.category.replace('_', ' ')}
        </Text>
        <Text style={styles.featuredTitle} numberOfLines={2}>
          {event.summary}
        </Text>
        <View style={styles.featuredBottom}>
          <View style={styles.avatarRow}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.avatarCircle, { marginLeft: i === 0 ? 0 : -6 }]} />
            ))}
            <Text style={styles.goingText}>{event.attendee_count === 0 ? 'Be the first' : `${event.attendee_count} going`}</Text>
          </View>
          <AttendButton event={event} size="compact" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function SignatureCard({ event }: { event: Event }) {
  const router = useRouter();
  const grad = CATEGORY_GRADIENT[event.category] ?? CATEGORY_GRADIENT.general;
  const emoji = CATEGORY_EMOJI[event.category] ?? '📅';

  return (
    <TouchableOpacity
      style={styles.sigCard}
      onPress={() => router.push(`/event/${event.id}`)}
      activeOpacity={0.85}
    >
      <View style={styles.sigHero}>
        {event.image_url ? (
          <ExpoImage
            source={{ uri: event.image_url }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
        ) : (
          <LinearGradient colors={grad} style={StyleSheet.absoluteFill}>
            <View style={styles.sigEmojiBg}>
              <Text style={styles.sigEmoji}>{emoji}</Text>
            </View>
          </LinearGradient>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.5)']}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.sigDayLabel}>{getDayLabel(event.start_at)}</Text>
      </View>
      <View style={styles.sigBody}>
        <Text style={styles.sigName} numberOfLines={2}>{event.summary}</Text>
        <Text style={styles.sigDesc} numberOfLines={2}>
          {formatTime(event.start_at)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function CompactCard({ event }: { event: Event }) {
  const router = useRouter();
  const grad = CATEGORY_GRADIENT[event.category] ?? CATEGORY_GRADIENT.general;
  const emoji = CATEGORY_EMOJI[event.category] ?? '📅';

  return (
    <TouchableOpacity
      style={styles.compactCard}
      onPress={() => router.push(`/event/${event.id}`)}
      activeOpacity={0.85}
    >
      <View style={styles.compactThumb}>
        {event.image_url ? (
          <ExpoImage
            source={{ uri: event.image_url }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
        ) : (
          <LinearGradient colors={grad} style={[StyleSheet.absoluteFill, styles.compactGradCenter]}>
            <Text style={styles.compactEmoji}>{emoji}</Text>
          </LinearGradient>
        )}
      </View>
      <View style={styles.compactBody}>
        <Text style={styles.compactCategory}>
          {event.category.replace('_', ' ')}
        </Text>
        <Text style={styles.compactName} numberOfLines={1}>{event.summary}</Text>
        <View style={styles.compactMeta}>
          <Text style={styles.compactTime}>{formatTime(event.start_at)}</Text>
          {event.cost_type === 'free' && (
            <View style={styles.freePill}>
              <Text style={styles.freePillText}>FREE</Text>
            </View>
          )}
          <Text style={styles.compactGoing}>{event.attendee_count === 0 ? 'Be the first' : `${event.attendee_count} going`}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TonightScreen() {
  const insets = useSafeAreaInsets();

  const tonightEvents = useEventsStore((s) => s.tonightEvents);
  const isLoading = useEventsStore((s) => s.isLoading);
  const fetchTonight = useEventsStore((s) => s.fetchTonight);
  const attendingUids = useAttendanceStore((s) => s.attendingUids);

  const [inviteEvent, setInviteEvent] = useState<Event | null>(null);
  const prevAttendingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetchTonight();
  }, []);

  // Detect new attendance → show InviteModal
  useEffect(() => {
    for (const uid of attendingUids) {
      if (!prevAttendingRef.current.has(uid)) {
        const ev = tonightEvents.find((e) => e.uid === uid);
        if (ev) {
          setInviteEvent(ev);
          break;
        }
      }
    }
    prevAttendingRef.current = new Set(attendingUids);
  }, [attendingUids, tonightEvents]);

  const featuredEvent = tonightEvents[0] ?? null;
  const signatureEvents = tonightEvents.filter((e) => e.is_recurring);
  const alsoTonightEvents = tonightEvents.slice(1).filter((e) => !e.is_recurring || tonightEvents.indexOf(e) > 3);

  return (
    <View style={styles.root}>
      <LoginSheet />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 + insets.bottom }}
      >
        {/* Header strip */}
        <View style={[styles.headerStrip, { paddingTop: insets.top + 14 }]}>
          <Image
            source={require('../../assets/images/hub-logo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <View style={styles.headerMeta}>
            <Text style={styles.headerTonight}>TODAY</Text>
            <Text style={styles.headerDate}>{formatHeaderDate()}</Text>
          </View>
        </View>

        {isLoading && tonightEvents.length === 0 ? (
          <View style={styles.loadingBox}>
            <Text style={styles.loadingText}>Loading today's events…</Text>
          </View>
        ) : tonightEvents.length === 0 ? (
          <View style={styles.loadingBox}>
            <Text style={styles.loadingText}>No events today. Check back soon!</Text>
          </View>
        ) : (
          <>
            {/* Featured event */}
            {featuredEvent && <FeaturedEventCard event={featuredEvent} />}

            {/* Signature recurring events */}
            {signatureEvents.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>SIGNATURE EVENTS</Text>
                  <Text style={styles.sectionLink}>See all</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.sigList}
                >
                  {signatureEvents.map((ev) => (
                    <SignatureCard key={ev.uid} event={ev} />
                  ))}
                </ScrollView>
              </>
            )}

            {/* Also tonight */}
            {alsoTonightEvents.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>ALSO TODAY</Text>
                </View>
                {alsoTonightEvents.map((ev) => (
                  <CompactCard key={ev.uid} event={ev} />
                ))}
              </>
            )}
          </>
        )}

        {/* Restaurant strip */}
        <View style={styles.restaurantStrip}>
          <Text style={styles.restaurantHeader}>DINING AT THE HUB</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.restaurantList}
          >
            {RESTAURANTS.map((r) => (
              <View key={r.name} style={styles.restaurantChip}>
                <Image
                  source={r.image}
                  style={styles.restaurantImg}
                  resizeMode="cover"
                />
                <Text style={styles.restaurantName}>{r.name}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      {inviteEvent && (
        <InviteModal
          visible={!!inviteEvent}
          event={inviteEvent}
          onClose={() => setInviteEvent(null)}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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

  // Header
  headerStrip: {
    backgroundColor: Colors.hubDark,
    paddingBottom: 18,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  headerLogo: {
    height: 52,
    width: 220,
    marginBottom: 10,
  },
  headerMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  headerTonight: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  headerDate: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.base,
    color: 'rgba(255,255,255,0.4)',
  },

  // Loading
  loadingBox: {
    paddingTop: 60,
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textLight,
  },

  // Featured card
  featured: {
    marginHorizontal: Spacing.base,
    marginTop: Spacing.base,
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
    overflow: 'hidden',
    ...Shadows.card,
  },
  featuredHero: {
    height: 155,
    backgroundColor: Colors.hubDark,
  },
  featuredBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: Colors.hubGold,
    borderRadius: Radius.full,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  featuredBadgeText: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.xs,
    color: Colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  timeBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.42)',
    borderRadius: Radius.full,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  timeBadgeText: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.xs,
    color: Colors.white,
  },
  featuredBody: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  featuredCategory: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.xs,
    color: Colors.hubGold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  featuredTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.h2,
    color: Colors.textDark,
    lineHeight: 23,
    marginBottom: 10,
  },
  featuredBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.creamDark,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  goingText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.base,
    color: Colors.textMid,
    marginLeft: 6,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingTop: 18,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.sm,
    color: Colors.textMid,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionLink: {
    fontFamily: Fonts.bodyMed,
    fontSize: FontSizes.base,
    color: Colors.hubGold,
  },

  // Signature cards
  sigList: {
    paddingHorizontal: Spacing.base,
    gap: 10,
    paddingBottom: 4,
  },
  sigCard: {
    width: 130,
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
    overflow: 'hidden',
    ...Shadows.compact,
  },
  sigHero: {
    height: 80,
    backgroundColor: Colors.hubDark,
  },
  sigEmojiBg: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sigEmoji: {
    fontSize: 28,
  },
  sigDayLabel: {
    position: 'absolute',
    bottom: 6,
    left: 8,
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.xs,
    color: Colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sigBody: {
    padding: 8,
    paddingBottom: 10,
  },
  sigName: {
    fontFamily: Fonts.displayMed,
    fontSize: FontSizes.md,
    color: Colors.textDark,
    lineHeight: 15,
    marginBottom: 3,
  },
  sigDesc: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textMid,
    lineHeight: 13,
  },

  // Compact card
  compactCard: {
    flexDirection: 'row',
    marginHorizontal: Spacing.base,
    marginBottom: 10,
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
    overflow: 'hidden',
    ...Shadows.compact,
  },
  compactThumb: {
    width: 70,
    backgroundColor: Colors.creamDark,
  },
  compactGradCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactEmoji: {
    fontSize: 28,
  },
  compactBody: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  compactCategory: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.xs,
    color: Colors.hubGold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  compactName: {
    fontFamily: Fonts.displayMed,
    fontSize: FontSizes.lg,
    color: Colors.textDark,
    marginBottom: 5,
  },
  compactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactTime: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textLight,
  },
  freePill: {
    backgroundColor: Colors.sportsGreen,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  freePillText: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.xs,
    color: Colors.sportsText,
  },
  compactGoing: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textLight,
  },

  // Restaurant strip
  restaurantStrip: {
    backgroundColor: Colors.hubDark,
    paddingHorizontal: Spacing.base,
    paddingTop: 16,
    paddingBottom: 18,
    marginTop: 8,
  },
  restaurantHeader: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  restaurantList: {
    gap: 8,
  },
  restaurantChip: {
    width: 90,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(200,150,42,0.25)',
  },
  restaurantImg: {
    width: 90,
    height: 52,
  },
  restaurantName: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    paddingTop: 5,
    paddingBottom: 6,
    paddingHorizontal: 4,
  },
});
