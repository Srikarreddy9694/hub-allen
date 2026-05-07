// Placeholder — Agent 6 will implement the Profile screen
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/typography';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Profile — coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream, alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: Fonts.body, color: Colors.textMid },
});
