import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Fonts, FontSizes } from '@/constants/typography';
import { Radius } from '@/constants/spacing';
import type { EventCategory } from '@/types';

const BADGE_CONFIG: Record<EventCategory, { bg: string; text: string; label: string }> = {
  sports:        { bg: '#E8F2EC', text: '#1A4A28', label: 'Sports' },
  trivia:        { bg: '#EDE8F5', text: '#3A1A6A', label: 'Trivia' },
  food_drink:    { bg: Colors.goldBadgeBg, text: Colors.goldBadgeTxt, label: 'Food & Drink' },
  live_music:    { bg: '#E8F5EB', text: '#1A4A20', label: 'Live Music' },
  movies:        { bg: '#E8EEF5', text: '#1A2A4A', label: 'Movies' },
  entertainment: { bg: '#F5EBE8', text: '#4A1A10', label: 'Entertainment' },
  general:       { bg: Colors.creamDark, text: Colors.textMid, label: 'Event' },
};

interface Props {
  category: EventCategory;
}

export default function CategoryBadge({ category }: Props) {
  const config = BADGE_CONFIG[category] ?? BADGE_CONFIG.general;
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
});
