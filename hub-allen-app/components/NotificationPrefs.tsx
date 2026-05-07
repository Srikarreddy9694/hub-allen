import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Colors } from '@/constants/colors';
import { Fonts, FontSizes } from '@/constants/typography';
import { Radius, Spacing } from '@/constants/spacing';
import type { EventCategory } from '@/types';

type CategoryOption = EventCategory | 'all';

const CATEGORY_OPTIONS: { key: CategoryOption; label: string }[] = [
  { key: 'all', label: 'Everything' },
  { key: 'sports', label: 'Sports' },
  { key: 'trivia', label: 'Trivia' },
  { key: 'food_drink', label: 'Food & Drink' },
  { key: 'live_music', label: 'Live Music' },
  { key: 'movies', label: 'Movies' },
];

export default function NotificationPrefs() {
  const user = useAuthStore((s) => s.user);
  const [enabled, setEnabled] = useState(false);
  const [eveningAlerts, setEveningAlerts] = useState(true);
  const [morningAlerts, setMorningAlerts] = useState(true);
  const [categories, setCategories] = useState<CategoryOption[]>(['all']);
  const [prefId, setPrefId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.id) loadPrefs(user.id);
  }, [user?.id]);

  async function loadPrefs(userId: string) {
    const { data } = await supabase
      .from('notification_prefs')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (data) {
      setEnabled(data.is_active);
      setEveningAlerts(data.evening_alerts);
      setMorningAlerts(data.morning_alerts);
      setCategories(data.categories ?? ['all']);
      setPrefId(data.id);
    }
  }

  async function handleEnableToggle(value: boolean) {
    if (!user?.id) return;

    if (value) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Enable notifications in your device settings to get Hub alerts.');
        return;
      }

      let token = '';
      try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
        const result = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
        token = result.data;
      } catch {
        token = 'simulator-token';
      }

      const upsertData = {
        user_id: user.id,
        expo_push_token: token,
        categories,
        morning_alerts: morningAlerts,
        evening_alerts: eveningAlerts,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('notification_prefs')
        .upsert(upsertData, { onConflict: 'user_id' })
        .select()
        .single();

      if (!error && data) {
        setPrefId(data.id);
        setEnabled(true);
      }
    } else {
      if (prefId) {
        await supabase
          .from('notification_prefs')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', prefId);
      }
      setEnabled(false);
    }
  }

  function toggleCategory(key: CategoryOption) {
    if (key === 'all') {
      setCategories(['all']);
      return;
    }
    setCategories((prev) => {
      const without = prev.filter((c) => c !== 'all' && c !== key);
      const hasKey = prev.includes(key);
      if (hasKey) return without.length > 0 ? without : ['all'];
      return [...without, key];
    });
  }

  async function handleSave() {
    if (!user?.id || !prefId) return;
    setSaving(true);
    await supabase
      .from('notification_prefs')
      .update({
        evening_alerts: eveningAlerts,
        morning_alerts: morningAlerts,
        categories,
        updated_at: new Date().toISOString(),
      })
      .eq('id', prefId);
    setSaving(false);
    Alert.alert('Saved', 'Your notification preferences have been updated.');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>PUSH NOTIFICATIONS</Text>

      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel}>Push Notifications</Text>
          <Text style={styles.rowSub}>Get Hub event alerts</Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={handleEnableToggle}
          trackColor={{ false: Colors.border, true: Colors.hubGreen }}
          thumbColor={Colors.white}
        />
      </View>

      {enabled && (
        <>
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>ALERT TIMING</Text>

          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Evening alerts</Text>
              <Text style={styles.rowSub}>4pm daily</Text>
            </View>
            <Switch
              value={eveningAlerts}
              onValueChange={setEveningAlerts}
              trackColor={{ false: Colors.border, true: Colors.hubGreen }}
              thumbColor={Colors.white}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Morning alerts</Text>
              <Text style={styles.rowSub}>10am weekends only</Text>
            </View>
            <Switch
              value={morningAlerts}
              onValueChange={setMorningAlerts}
              trackColor={{ false: Colors.border, true: Colors.hubGreen }}
              thumbColor={Colors.white}
            />
          </View>

          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>CATEGORIES</Text>

          <View style={styles.checkboxGrid}>
            {CATEGORY_OPTIONS.map(({ key, label }) => {
              const active = key === 'all'
                ? categories.includes('all')
                : categories.includes(key) && !categories.includes('all');
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.checkbox, active && styles.checkboxActive]}
                  onPress={() => toggleCategory(key)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.checkboxLabel, active && styles.checkboxLabelActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Text style={styles.saveBtnLabel}>{saving ? 'Saving…' : 'Save preferences'}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.xs,
    color: Colors.textLight,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.base,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontFamily: Fonts.bodyMed,
    fontSize: FontSizes.md,
    color: Colors.textDark,
  },
  rowSub: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textLight,
    marginTop: 2,
  },
  divider: {
    height: 20,
  },
  checkboxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  checkbox: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.creamDark,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  checkboxActive: {
    backgroundColor: Colors.hubGreen,
    borderColor: Colors.hubGreen,
  },
  checkboxLabel: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.sm,
    color: Colors.textMid,
  },
  checkboxLabelActive: {
    color: Colors.white,
  },
  saveBtn: {
    marginHorizontal: Spacing.base,
    backgroundColor: Colors.hubGreen,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnLabel: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.lg,
    color: Colors.white,
  },
});
