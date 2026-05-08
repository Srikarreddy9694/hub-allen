import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Fonts, FontSizes } from '@/constants/typography';
import { Radius, Spacing } from '@/constants/spacing';
import { Shadows } from '@/constants/shadows';
import type { Event, EventCategory } from '@/types';

const EVENT_BLURHASH = 'L25##O00xus.00WB%Ma}00of~qt7';

const CATEGORY_GRADIENT: Record<EventCategory, readonly [string, string]> = {
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

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Chicago',
  });
}

interface Props {
  event: Event;
}

export default function EventCard({ event }: Props) {
  const router = useRouter();
  const gradient = CATEGORY_GRADIENT[event.category] ?? CATEGORY_GRADIENT.general;
  const emoji = CATEGORY_EMOJI[event.category] ?? '📅';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/event/${event.id}`)}
      activeOpacity={0.85}
    >
      {/* Thumbnail */}
      <View style={styles.thumbnail}>
        {event.image_url ? (
          <Image
            source={{ uri: event.image_url }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={300}
            placeholder={EVENT_BLURHASH}
          />
        ) : (
          <LinearGradient
            colors={[gradient[0], gradient[1]]}
            style={[StyleSheet.absoluteFill, styles.gradientCenter]}
          >
            <Text style={styles.emoji}>{emoji}</Text>
          </LinearGradient>
        )}
      </View>

      {/* Body */}
      <View style={styles.body}>
        <Text style={styles.category}>{event.category.replace('_', ' ')}</Text>
        <Text style={styles.name} numberOfLines={1}>{event.summary}</Text>
        <View style={styles.meta}>
          <Text style={styles.time}>{formatTime(event.start_at)}</Text>
          {event.cost_type === 'free' && (
            <View style={styles.freePill}>
              <Text style={styles.freeText}>FREE</Text>
            </View>
          )}
          <Text style={styles.going}>{event.attendee_count === 0 ? 'Be the first' : `${event.attendee_count} going`}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    marginHorizontal: Spacing.base,
    marginBottom: 10,
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
    overflow: 'hidden',
    ...Shadows.compact,
  },
  thumbnail: {
    width: 70,
    backgroundColor: Colors.creamDark,
  },
  gradientCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 28,
  },
  body: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  category: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.xs,
    color: Colors.hubGold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  name: {
    fontFamily: Fonts.displayMed,
    fontSize: FontSizes.h3 - 5,
    color: Colors.textDark,
    marginBottom: 5,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  time: {
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
  freeText: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.xs,
    color: Colors.sportsText,
    textTransform: 'uppercase',
  },
  going: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textLight,
  },
});
