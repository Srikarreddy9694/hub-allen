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

### Logo filename + conflicting root entry files
[Fix | Logo] assets/images/hub-logo.png — created as canonical filename (copy of hub_logo.png); updated require() paths in app/(tabs)/index.tsx (was hub-logo-white.png), components/LoginSheet.tsx (was hub_logo.png), app/(tabs)/profile.tsx (was hub_logo.png)
[Fix | Entry conflict] deleted index.ts (registerRootComponent conflicts with Expo Router's own entry point) and App.tsx (unused default template file); bundle resolves cleanly without them

## Session 4 — Bug Fixes

[Fix | Tab bar safe area] app/(tabs)/_layout.tsx — added useSafeAreaInsets, tab bar height now accounts for S24 Ultra system navigation bar (height: 64 + insets.bottom, paddingBottom: insets.bottom + 6); removed hardcoded paddingBottom from StyleSheet
[Fix | Logo size] app/(tabs)/index.tsx — increased header logo from 38×160 to 52×220
[Fix | Event time timezone] supabase/functions/sync-events/index.ts — parseDate now correctly applies America/Chicago offset (CDT -05:00 Mar–Oct / CST -06:00 Nov–Feb) instead of treating local time as UTC; DTSTART/DTEND cases now pass full rawKey+value so TZID param is available to parseDate
[Fix | HTML in description] supabase/functions/sync-events/index.ts + app/event/[id].tsx — stripHtml() added in edge function before DB storage (strips tags, decodes HTML entities, collapses whitespace) and in app as safety net on description render

## Session 5 — Bug Fixes

[Fix | Tab label wrapping] app/(tabs)/_layout.tsx — added width 33.33% and overflow hidden to tabItem, numberOfLines=1 and adjustsFontSizeToFit to prevent "Upcoming" splitting to 2 lines on S24 Ultra
[Fix | Event detail safe area] app/event/[id].tsx — contentContainerStyle paddingBottom now uses 48 + insets.bottom, clearing Android system nav bar on S24 Ultra
[Fix | Save button auth] app/event/[id].tsx — save ♡ now checks session before calling toggleSaved; logged-out users see LoginSheet with callback that auto-saves after sign-in; logged-in users toggle immediately

## Session 5 Complete
[Fix | Tab label wrapping] app/(tabs)/_layout.tsx
[Fix | Event detail safe area] app/event/[id].tsx
[Fix | Save button auth] app/event/[id].tsx

## Session 6 — Bug Fixes

[Fix | Tab bar revert + fix] app/(tabs)/_layout.tsx — reverted broken width/adjustsFontSizeToFit approach, fixed label wrapping by reducing fontSize to 8px

## Session 6 Complete

## Session 7 — Bug Fixes

[Fix | LoginSheet safe area] components/LoginSheet.tsx — added useSafeAreaInsets, sheet paddingBottom now dynamic using insets.bottom + Spacing.xl, magic link button no longer hidden behind S24 Ultra system nav bar
[Fix | Tab label wrapping] app/(tabs)/_layout.tsx — removed letterSpacing (was 0.4), "Upcoming" now fits on one line on S24 Ultra
[Fix | Global safe area audit] all tab screens and LoginSheet — confirmed _layout.tsx and event/[id].tsx already had insets; added useSafeAreaInsets to events.tsx and profile.tsx; inlined contentContainerStyle on index.tsx, events.tsx, and profile.tsx ScrollViews/SectionList to use insets.bottom; LoginSheet modal also fixed above

## Session 7 Complete
Root cause: useSafeAreaInsets not applied consistently across all screens and modals. Fixed globally across all 5 screens and LoginSheet.

## Session 4 Complete
All four S24 Ultra fixes applied. Files changed: app/(tabs)/_layout.tsx, app/(tabs)/index.tsx, app/event/[id].tsx, supabase/functions/sync-events/index.ts. Edge function redeployed to lldsmbjsiaqfirerwcbq. Metro starts with zero errors. Trigger a manual sync-events invoke from the Supabase dashboard to re-populate events with corrected timestamps and clean descriptions.

## Session 8 — Pre-demo Polish

[Fix | Tonight→Today] app/(tabs)/index.tsx — header "TONIGHT"→"TODAY", loading text "tonight's"→"today's", empty state "tonight"→"today"
[Fix | Tonight→Today] app/(tabs)/_layout.tsx — tab label "Tonight"→"Today"
[Fix | TabIcon flex] app/(tabs)/_layout.tsx — rebuilt TabIcon: flex:1 + justifyContent:center on tabItem, fontSize:9, lineHeight:24 on emoji, marginTop:2 on label and dot, numberOfLines={1} on label Text; definitively prevents "Upcoming" from wrapping on S24 Ultra
[Fix | Be the first] components/EventCard.tsx — going text now "Be the first" when attendee_count === 0
[Fix | Be the first] app/(tabs)/index.tsx — FeaturedEventCard goingText and CompactCard compactGoing now "Be the first" when attendee_count === 0
[Confirm | Calendar no auth] app/event/[id].tsx — handleAddToCalendar confirmed: no session check, calendar available to all users

## Session 8 Complete

### NotificationPrefs crash + boolean cast fixes
[Fix | NotificationPrefs] components/NotificationPrefs.tsx — two fixes:
1. Expo Go SDK 53 crash: wrapped Notifications.requestPermissionsAsync() and getExpoPushTokenAsync() in separate try/catch blocks; permission failure shows a non-crashing alert explaining dev build is required; token falls back to 'dev-build-required'; rest of UI (toggles, checkboxes, save) still renders and functions
2. Supabase boolean-as-string cast: morning_alerts and evening_alerts now read as `=== true || === 'true'`; categories parsed with Array.isArray guard, falling back to JSON.parse for string values
