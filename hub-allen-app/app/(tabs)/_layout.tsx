import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Fonts, FontSizes } from '@/constants/typography';

interface TabIconProps {
  emoji: string;
  label: string;
  focused: boolean;
}

function TabIcon({ emoji, label, focused }: TabIconProps) {
  return (
    <View style={styles.tabItem}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text
        style={[
          styles.label,
          focused && styles.labelActive,
        ]}
      >
        {label}
      </Text>
      {focused && <View style={styles.dot} />}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🌙" label="Tonight" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📅" label="Upcoming" focused={focused} />
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
    height: 64,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingBottom: 6,
  },
  tabItem: {
    alignItems: 'center',
    gap: 3,
    paddingTop: 8,
  },
  emoji: {
    fontSize: 21,
  },
  label: {
    fontFamily: Fonts.bodyMed,
    fontSize: FontSizes.xs,
    color: Colors.textLight,
    letterSpacing: 0.4,
  },
  labelActive: {
    color: Colors.hubGreen,
    fontFamily: Fonts.bodySemi,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 999,
    backgroundColor: Colors.hubGold,
    marginTop: 1,
  },
});
