# Hub Allen App — Build Progress

## Session 2 — Screens & Components

### Agent 5 — NotificationPrefs
[Agent 5 | NotificationPrefs] components/NotificationPrefs.tsx — created (enable toggle with expo-notifications permission + push token, evening/morning alert switches, category checkboxes, save button, loads prefs from Supabase on mount)

### Agent 6 — LoginSheet + Profile
[Agent 6 | LoginSheet] components/LoginSheet.tsx — created (RN Modal slide-up sheet, Google/Apple Coming Soon alerts, magic link OTP flow, 30s resend cooldown, magic_sent state)
[Agent 6 | Profile] app/(tabs)/profile.tsx — created (logged-out: inline auth prompt; logged-in: avatar/initials, saved events list, NotificationPrefs, sign out)

### Agent 7 — InviteModal
[Agent 7 | InviteModal] components/InviteModal.tsx — created (centered overlay Modal, Facebook/SMS/Copy share actions)

### Agent 4 — Event Detail
[Agent 4 | EventDetail] app/event/[id].tsx — created (hero 200px with LinearGradient fade to cream, back/save buttons, category+free badges, meta rows, attendees row, AttendButton, description, 3-col action buttons, dining strip, InviteModal on attend)

### Agent 3 — Upcoming Screen
[Agent 3 | Upcoming] app/(tabs)/events.tsx — created (category pill filters, SectionList grouped by date with Today/Tomorrow labels, infinite scroll pagination, empty states)

### Agent 2 — Tonight Screen
[Agent 2 | Tonight] app/(tabs)/index.tsx — created (dark header strip with logo, FeaturedEventCard with hero/badges/AttendButton, SignatureEventCard horizontal scroll for recurring events, CompactCard list for also-tonight, RestaurantStrip with local images, InviteModal on attend)

## Session 2 Complete
All screens implemented. Dependencies added: tailwindcss@3 (NativeWind preset), babel-preset-expo, react-native-screens, react-native-safe-area-context, react-native-worklets. Bundle exports successfully.

## Session 3 — Bug Fixes

### React version mismatch + Tabs crash + edge function 401
[Fix | React pin] package.json — pinned react and react-dom to exact 19.1.0 (removed caret); regenerated package-lock.json; resolves react@19.2.x vs react-native-renderer@19.1.0 crash at startup
[Fix | Tabs crash] app/_layout.tsx — added `import 'react-native-gesture-handler'` as first import; prevents undefined default export on Tabs component on Android
[Fix | 401 edge fn] lib/api.ts — simplified callEdgeFunction headers to always send both `apikey` and `Authorization: Bearer <anon-key>`; removed session-token branch that sent user JWT and caused 401 on unauthenticated calls; also removed now-unused supabase import

### NotificationPrefs crash + boolean cast fixes
[Fix | NotificationPrefs] components/NotificationPrefs.tsx — two fixes:
1. Expo Go SDK 53 crash: wrapped Notifications.requestPermissionsAsync() and getExpoPushTokenAsync() in separate try/catch blocks; permission failure shows a non-crashing alert explaining dev build is required; token falls back to 'dev-build-required'; rest of UI (toggles, checkboxes, save) still renders and functions
2. Supabase boolean-as-string cast: morning_alerts and evening_alerts now read as `=== true || === 'true'`; categories parsed with Array.isArray guard, falling back to JSON.parse for string values
