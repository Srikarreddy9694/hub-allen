import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEventsStore } from '@/stores/eventsStore';
import EventCard from '@/components/EventCard';
import { Colors } from '@/constants/colors';
import { Fonts, FontSizes } from '@/constants/typography';
import { Radius, Spacing } from '@/constants/spacing';
import type { Event, EventCategory } from '@/types';

type CategoryOption = EventCategory | 'all';

const CATEGORY_PILLS: { key: CategoryOption; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'sports', label: 'Sports' },
  { key: 'trivia', label: 'Trivia' },
  { key: 'food_drink', label: 'Food & Drink' },
  { key: 'live_music', label: 'Live Music' },
  { key: 'movies', label: 'Movies' },
  { key: 'entertainment', label: 'Entertainment' },
];

function formatSectionDate(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const todayStr = today.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
  const tomorrowStr = tomorrow.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
  const dateStr = date.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });

  if (dateStr === todayStr) return 'Today';
  if (dateStr === tomorrowStr) return 'Tomorrow';

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Chicago',
  });
}

function groupByDate(events: Event[]): { title: string; data: Event[] }[] {
  const map = new Map<string, Event[]>();
  for (const ev of events) {
    const key = new Date(ev.start_at).toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(ev);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, data]) => ({
      title: formatSectionDate(data[0].start_at),
      data,
    }));
}

export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const upcomingEvents = useEventsStore((s) => s.upcomingEvents);
  const selectedCategory = useEventsStore((s) => s.selectedCategory);
  const isLoading = useEventsStore((s) => s.isLoading);
  const fetchUpcoming = useEventsStore((s) => s.fetchUpcoming);
  const setCategory = useEventsStore((s) => s.setCategory);

  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    setPage(0);
    setHasMore(true);
    fetchUpcoming(selectedCategory);
  }, [selectedCategory]);

  const sections = useMemo(() => groupByDate(upcomingEvents), [upcomingEvents]);

  function handleCategoryPress(key: CategoryOption) {
    if (key === selectedCategory) return;
    setCategory(key as EventCategory | 'all');
  }

  async function handleLoadMore() {
    if (loadingMore || !hasMore || isLoading) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const { fetchUpcomingEvents } = await import('@/lib/api');
      const more = await fetchUpcomingEvents(
        selectedCategory === 'all' ? undefined : selectedCategory,
        nextPage,
      );
      if (more.length === 0) {
        setHasMore(false);
      } else {
        useEventsStore.setState((s) => ({
          upcomingEvents: [...s.upcomingEvents, ...more],
        }));
        setPage(nextPage);
      }
    } catch {
      // silent
    } finally {
      setLoadingMore(false);
    }
  }

  const renderSectionHeader = useCallback(
    ({ section }: { section: { title: string } }) => (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
      </View>
    ),
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: Event }) => <EventCard event={item} />,
    [],
  );

  const keyExtractor = useCallback((item: Event) => item.uid, []);

  const ListHeader = (
    <View style={styles.header}>
      <Text style={styles.screenTitle}>Upcoming Events</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsRow}
      >
        {CATEGORY_PILLS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.pill, selectedCategory === key && styles.pillActive]}
            onPress={() => handleCategoryPress(key)}
            activeOpacity={0.75}
          >
            <Text style={[styles.pillLabel, selectedCategory === key && styles.pillLabelActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const ListEmpty = isLoading ? null : (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No events found</Text>
    </View>
  );

  const ListFooter = loadingMore ? (
    <ActivityIndicator color={Colors.hubGreen} style={{ marginVertical: 20 }} />
  ) : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {isLoading && upcomingEvents.length === 0 ? (
        <>
          {ListHeader}
          <ActivityIndicator color={Colors.hubGreen} style={{ marginTop: 40 }} />
        </>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={ListEmpty}
          ListFooterComponent={ListFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          contentContainerStyle={{ paddingBottom: 48 + insets.bottom }}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.cream,
  },

  // Header
  header: {
    paddingBottom: Spacing.sm,
  },
  screenTitle: {
    fontFamily: Fonts.displayBold,
    fontSize: FontSizes.h2,
    color: Colors.textDark,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.sm,
  },
  pillsRow: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
    paddingBottom: 4,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  pillActive: {
    backgroundColor: Colors.hubGreen,
    borderColor: Colors.hubGreen,
  },
  pillLabel: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.base,
    color: Colors.textMid,
  },
  pillLabelActive: {
    color: Colors.white,
  },

  // Section header
  sectionHeader: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.sm,
    color: Colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  listContent: {
    paddingBottom: 48,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textLight,
  },
});
