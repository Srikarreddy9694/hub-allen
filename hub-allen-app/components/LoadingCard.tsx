import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { Shadows } from '@/constants/shadows';

export default function LoadingCard() {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 750, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.card, { opacity }]}>
      <View style={styles.image} />
      <View style={styles.body}>
        <View style={[styles.line, { width: '40%', height: 8 }]} />
        <View style={[styles.line, { width: '75%', height: 13, marginTop: 6 }]} />
        <View style={[styles.line, { width: '55%', height: 8, marginTop: 8 }]} />
      </View>
    </Animated.View>
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
  image: {
    width: 70,
    backgroundColor: Colors.creamDark,
  },
  body: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  line: {
    backgroundColor: Colors.creamDark,
    borderRadius: 4,
  },
});