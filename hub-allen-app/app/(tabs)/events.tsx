// Placeholder — Agent 3 will implement the Upcoming screen
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/typography';

export default function EventsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Upcoming Events — coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream, alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: Fonts.body, color: Colors.textMid },
});
