import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Colors } from '@/constants/colors';
import { Fonts, FontSizes } from '@/constants/typography';
import { Radius, Spacing } from '@/constants/spacing';
import { Shadows } from '@/constants/shadows';

const RESEND_COOLDOWN = 30;

export default function LoginSheet() {
  const visible = useAuthStore((s) => s.loginSheetVisible);
  const closeLoginSheet = useAuthStore((s) => s.closeLoginSheet);

  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'magic_sent'>('idle');
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!visible) {
      setTimeout(() => {
        setEmail('');
        setState('idle');
        setCountdown(0);
        if (timerRef.current) clearInterval(timerRef.current);
      }, 300);
    }
  }, [visible]);

  function startCooldown() {
    setCountdown(RESEND_COOLDOWN);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  async function handleSendMagicLink() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    Keyboard.dismiss();
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { shouldCreateUser: true },
    });
    setSending(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    setState('magic_sent');
    startCooldown();
  }

  async function handleResend() {
    if (countdown > 0) return;
    const trimmed = email.trim().toLowerCase();
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { shouldCreateUser: true },
    });
    setSending(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    startCooldown();
  }

  function handleDifferentEmail() {
    if (timerRef.current) clearInterval(timerRef.current);
    setCountdown(0);
    setEmail('');
    setState('idle');
  }

  function handleComingSoon(provider: string) {
    Alert.alert('Coming soon', `${provider} sign-in will be available in a future update.`);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={closeLoginSheet}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={closeLoginSheet}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        style={styles.sheetWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        pointerEvents="box-none"
      >
        <View style={styles.sheet}>
          {/* Drag handle */}
          <View style={styles.handle} />

          {state === 'idle' ? (
            <>
              <Image
                source={require('../assets/images/hub_logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />

              <Text style={styles.tagline}>
                Sign in to save events, mark attendance & get alerts
              </Text>

              {/* Google */}
              <TouchableOpacity
                style={styles.oauthBtn}
                onPress={() => handleComingSoon('Google')}
                activeOpacity={0.8}
              >
                <Text style={styles.oauthIcon}>G</Text>
                <Text style={styles.oauthLabel}>Continue with Google</Text>
              </TouchableOpacity>

              {/* Apple */}
              <TouchableOpacity
                style={[styles.oauthBtn, styles.appleBtn]}
                onPress={() => handleComingSoon('Apple')}
                activeOpacity={0.8}
              >
                <Text style={[styles.oauthIcon, styles.appleIcon]}></Text>
                <Text style={[styles.oauthLabel, styles.appleLabel]}>Continue with Apple</Text>
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor={Colors.textLight}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="send"
                onSubmitEditing={handleSendMagicLink}
              />

              <TouchableOpacity
                style={[styles.magicBtn, sending && styles.magicBtnDisabled]}
                onPress={handleSendMagicLink}
                disabled={sending}
                activeOpacity={0.8}
              >
                <Text style={styles.magicBtnLabel}>
                  {sending ? 'Sending…' : '✉  Send magic link'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.sentEmoji}>📬</Text>
              <Text style={styles.sentHeading}>Check your inbox</Text>
              <Text style={styles.sentSub}>We sent a link to {email.trim()}</Text>

              <TouchableOpacity
                style={[styles.resendBtn, countdown > 0 && styles.resendBtnDisabled]}
                onPress={handleResend}
                disabled={countdown > 0 || sending}
                activeOpacity={0.8}
              >
                <Text style={[styles.resendLabel, countdown > 0 && styles.resendLabelDisabled]}>
                  {countdown > 0 ? `Resend in ${countdown}s` : 'Resend'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.differentBtn} onPress={handleDifferentEmail} activeOpacity={0.7}>
                <Text style={styles.differentLabel}>Use a different email</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.xl,
    paddingTop: Spacing.base,
    alignItems: 'center',
    ...Shadows.sheet,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  logo: {
    height: 32,
    width: 160,
    marginBottom: Spacing.base,
  },
  tagline: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textMid,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  oauthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderRadius: Radius.md,
    paddingVertical: 13,
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.creamDark,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 10,
  },
  appleBtn: {
    backgroundColor: Colors.textDark,
    borderColor: Colors.textDark,
  },
  oauthIcon: {
    fontFamily: Fonts.bodySemi,
    fontSize: 16,
    color: Colors.textDark,
    width: 22,
    textAlign: 'center',
  },
  appleIcon: {
    color: Colors.white,
  },
  oauthLabel: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.md,
    color: Colors.textDark,
  },
  appleLabel: {
    color: Colors.white,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: Spacing.base,
    gap: Spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textLight,
  },
  input: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: 13,
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textDark,
    backgroundColor: Colors.cream,
    marginBottom: Spacing.sm,
  },
  magicBtn: {
    width: '100%',
    backgroundColor: Colors.hubGreen,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  magicBtnDisabled: {
    opacity: 0.6,
  },
  magicBtnLabel: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.lg,
    color: Colors.white,
  },
  // magic_sent state
  sentEmoji: {
    fontSize: 48,
    marginBottom: Spacing.base,
    marginTop: Spacing.sm,
  },
  sentHeading: {
    fontFamily: Fonts.displayBold,
    fontSize: FontSizes.h2,
    color: Colors.textDark,
    marginBottom: 6,
  },
  sentSub: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textMid,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  resendBtn: {
    width: '100%',
    backgroundColor: Colors.hubGreen,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  resendBtnDisabled: {
    backgroundColor: Colors.creamDark,
  },
  resendLabel: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.lg,
    color: Colors.white,
  },
  resendLabelDisabled: {
    color: Colors.textLight,
  },
  differentBtn: {
    paddingVertical: Spacing.sm,
  },
  differentLabel: {
    fontFamily: Fonts.bodyMed,
    fontSize: FontSizes.md,
    color: Colors.textLight,
  },
});
