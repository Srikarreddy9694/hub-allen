import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '@/stores/authStore';
import { useAttendanceStore } from '@/stores/attendanceStore';
import { Colors } from '@/constants/colors';
import { Fonts, FontSizes } from '@/constants/typography';
import { Radius } from '@/constants/spacing';
import type { Event } from '@/types';

interface Props {
  event: Event;
  size?: 'compact' | 'large';
}

export default function AttendButton({ event, size = 'compact' }: Props) {
  const session = useAuthStore((s) => s.session);
  const openLoginSheet = useAuthStore((s) => s.openLoginSheet);
  const attendingUids = useAttendanceStore((s) => s.attendingUids);
  const toggleAttendance = useAttendanceStore((s) => s.toggleAttendance);

  const isAttending = attendingUids.has(event.uid);

  const handlePress = () => {
    if (!session) {
      openLoginSheet(() => toggleAttendance(event.uid, event));
      return;
    }
    toggleAttendance(event.uid, event);
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isAttending && styles.attending,
        size === 'large' && styles.large,
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <Text
        style={[
          styles.label,
          isAttending && styles.attendingLabel,
          size === 'large' && styles.largeLabel,
        ]}
      >
        {isAttending ? 'Going ✓' : "I'm Attending"}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.hubGreen,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  attending: {
    backgroundColor: Colors.hubGoldLight,
  },
  large: {
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  label: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.base,
    color: Colors.white,
  },
  attendingLabel: {
    color: Colors.hubGold,
  },
  largeLabel: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.lg,
  },
});
