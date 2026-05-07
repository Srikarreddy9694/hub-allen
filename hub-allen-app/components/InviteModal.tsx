import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Linking,
  StyleSheet,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Colors } from '@/constants/colors';
import { Fonts, FontSizes } from '@/constants/typography';
import { Radius, Spacing } from '@/constants/spacing';
import { Shadows } from '@/constants/shadows';
import type { Event } from '@/types';

interface InviteModalProps {
  visible: boolean;
  event: Event;
  onClose: () => void;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Chicago',
  });
}

export default function InviteModal({ visible, event, onClose }: InviteModalProps) {
  const [toast, setToast] = useState(false);

  const handleFacebook = () => {
    if (!event.event_url) return;
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(event.event_url)}`;
    Linking.openURL(url);
  };

  const handleSMS = () => {
    if (!event.event_url) return;
    const time = formatTime(event.start_at);
    const body = `Hey! I'm going to ${event.summary} at The HUB Allen at ${time}. Come join! ${event.event_url}`;
    Linking.openURL(`sms:?body=${encodeURIComponent(body)}`);
  };

  const handleCopy = async () => {
    if (!event.event_url) return;
    await Clipboard.setStringAsync(event.event_url);
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              <Text style={styles.emoji}>🎉</Text>
              <Text style={styles.heading}>You're going!</Text>
              <Text style={styles.sub}>Bring your crew?</Text>

              <TouchableOpacity style={styles.actionBtn} onPress={handleFacebook} activeOpacity={0.8}>
                <Text style={styles.actionIcon}>f</Text>
                <Text style={styles.actionLabel}>Post on Facebook</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={handleSMS} activeOpacity={0.8}>
                <Text style={styles.actionIcon}>✉</Text>
                <Text style={styles.actionLabel}>Invite via SMS</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={handleCopy} activeOpacity={0.8}>
                <Text style={styles.actionIcon}>⎘</Text>
                <Text style={styles.actionLabel}>
                  {toast ? 'Link copied!' : 'Copy Link'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.laterBtn} onPress={onClose} activeOpacity={0.7}>
                <Text style={styles.laterLabel}>Maybe later</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  card: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 28,
    alignItems: 'center',
    ...Shadows.card,
  },
  emoji: {
    fontSize: 40,
    marginBottom: Spacing.sm,
  },
  heading: {
    fontFamily: Fonts.displayBold,
    fontSize: FontSizes.h2,
    color: Colors.textDark,
    marginBottom: 4,
  },
  sub: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textMid,
    marginBottom: Spacing.lg,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: Colors.creamDark,
    borderRadius: Radius.md,
    paddingVertical: 13,
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    gap: 12,
  },
  actionIcon: {
    fontFamily: Fonts.bodySemi,
    fontSize: 16,
    color: Colors.hubGreen,
    width: 22,
    textAlign: 'center',
  },
  actionLabel: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.lg,
    color: Colors.textDark,
  },
  laterBtn: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  laterLabel: {
    fontFamily: Fonts.bodyMed,
    fontSize: FontSizes.md,
    color: Colors.textLight,
  },
});
