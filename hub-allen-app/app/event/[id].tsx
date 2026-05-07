// Placeholder — Agent 4 will implement the Event Detail screen
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/typography';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Event {id} — coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream, alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: Fonts.body, color: Colors.textMid },
});
