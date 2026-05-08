import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Fonts, FontSizes } from '@/constants/typography';

function CalendarIcon({ focused }: { focused: boolean }) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateNum = tomorrow.toLocaleDateString('en-US', {
    day: 'numeric',
    timeZone: 'America/Chicago',
  });

  return (
    <View style={calStyles.wrap}>
      <View style={calStyles.header} />
      <View style={calStyles.body}>
        <Text style={[calStyles.date, focused && calStyles.dateFocused]}>
          {dateNum}
        </Text>
      </View>
    </View>
  );
}

const calStyles = StyleSheet.create({
  wrap: {
    width: 24,
    height: 22,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.textLight,
  },
  header: {
    height: 6,
    backgroundColor: Colors.hubGold,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  date: {
    fontSize: 9,
    fontFamily: Fonts.bodySemi,
    color: Colors.textDark,
    lineHeight: 11,
  },
  dateFocused: {
    color: Colors.hubGreen,
  },
});

interface TabIconProps {
  emoji?: string;
  customIcon?: React.ReactNode;
  label: string;
  focused: boolean;
}

function TabIcon({ emoji, customIcon, label, focused }: TabIconProps) {
  return (
    <View style={styles.tabItem}>
      {customIcon ?? <Text style={styles.emoji}>{emoji}</Text>}
      <Text style={[styles.label, focused && styles.labelActive]}>
        {label}
      </Text>
      {focused && <View style={styles.dot} />}
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 64 + insets.bottom,
          paddingBottom: insets.bottom + 6,
          backgroundColor: Colors.white,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="☀️" label="Today" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              customIcon={<CalendarIcon focused={focused} />}
              label="Upcoming"
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="👤" label="Profile" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    // dynamic height/padding applied inline via useSafeAreaInsets
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingTop: 6,
  },
  emoji: {
    fontSize: 20,
    lineHeight: 24,
  },
  label: {
    fontFamily: Fonts.bodyMed,
    fontSize: 8,
    color: Colors.textLight,
    letterSpacing: 0,
    textAlign: 'center',
    marginTop: 2,
  },
  labelActive: {
    color: Colors.hubGreen,
    fontFamily: Fonts.bodySemi,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.hubGold,
    marginTop: 2,
  },
});
