// Placeholder — Agent 2 will implement the Tonight screen
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/typography';

export default function TonightScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Tonight — coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream, alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: Fonts.body, color: Colors.textMid },
});
