# Hub Allen App — Development Blueprint v4

**Stack:** React Native (Expo SDK 52) · Supabase · Expo Push Notifications
**Data:** Timely iCal — `https://timelyapp.time.ly/api/calendars/54718021/export?format=ics&target=copy`
**Auth:** Magic Link (now) · Google OAuth + Apple Sign In (later, before launch)
**Cron:** Supabase native pg_cron — no external service needed
**Design ref:** `hub-app-design-spec.md` + `hub-app-mockup-v2.html`

---

## How To Read This Document

| If you are... | Read... |
|---|---|
| **The project owner (Srikar)** | Pre-Build Setup, then hand each agent their section |
| **Agent 1** | Pre-Build Setup (to understand what's already done), then your full Agent 1 section |
| **Agents 2–7** | Your own agent section only. Treat all other files as read-only |
| **Any agent doing UI work** | Read `hub-app-design-spec.md` in full before touching a single style |

---

## App Philosophy

**Browsing is open. Actions are gated.**

| What the user does | Login required? |
|---|---|
| Browse Tonight / Upcoming screens | ❌ Free |
| View event detail + see attendee count | ❌ Free |
| Save an event ♡ | ✅ → LoginSheet slides up |
| Mark "I'm Attending" | ✅ → LoginSheet slides up |
| Enable push notifications | ✅ → LoginSheet slides up |
| Invite friends (after attending) | ✅ Already logged in at this point |

The LoginSheet is a bottom sheet modal — it never pushes a new screen. It slides up, user signs in, sheet closes, and the original action completes automatically.

---

## System Architecture

```
[Timely iCal feed]
        │
        ▼
[Supabase Edge Fn: sync-events] ◄── pg_cron (hourly)
        │
        ▼
[Postgres: events table]
        │
        ├──► [Edge Fn: get-events] ◄──────────────── React Native App
        │                                                    │
        │                                           [attendanceStore]
        │                                           [authStore]
        │                                           [eventsStore]
        │
[Postgres: notification_prefs] ◄── user saves prefs via app
        │
[Edge Fn: send-notifications] ◄── pg_cron (10am Sat/Sun + 4pm daily CST)
        │
[Expo Push Service → FCM / APNs → device]
```

---

## ═══════════════════════════════════════════
## SECTION 1 — PROJECT OWNER SETUP
## (Complete this before Agent 1 starts)
## ═══════════════════════════════════════════

### 1A · Confirmed Values

```
iCal URL:     https://timelyapp.time.ly/api/calendars/54718021/export?format=ics&target=copy
App scheme:   huballen
Deep link:    huballen://auth/callback
```

### 1B · Supabase Project Setup

1. Go to supabase.com → New Project
2. Name: `hub-allen` · Region: US East · Free tier
3. Once created → Settings → API → copy and save:
   - **Project URL** → goes into `.env` as `EXPO_PUBLIC_SUPABASE_URL`
   - **anon public key** → goes into `.env` as `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → keep private, needed for edge function secrets

### 1C · Run Database Schema in Supabase

Go to **Supabase → SQL Editor → New Query**.

**Run Block 1 of 3 — Tables**
Copy and run everything between the START and END markers below.

```sql
-- ▶▶▶ BLOCK 1 START — TABLES (run this first) ◀◀◀

CREATE TABLE events (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  uid             TEXT        UNIQUE NOT NULL,
  summary         TEXT        NOT NULL,
  description     TEXT,
  category        TEXT        NOT NULL DEFAULT 'general',
  start_at        TIMESTAMPTZ NOT NULL,
  end_at          TIMESTAMPTZ NOT NULL,
  is_recurring    BOOLEAN     DEFAULT false,
  image_url       TEXT,
  event_url       TEXT,
  cost_type       TEXT        DEFAULT 'free',
  attendee_count  INTEGER     DEFAULT 0,
  is_active       BOOLEAN     DEFAULT true,
  synced_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_events_start_at ON events(start_at);
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_active   ON events(is_active, start_at);

CREATE TABLE saved_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  event_uid   TEXT        NOT NULL,
  saved_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, event_uid)
);

CREATE INDEX idx_saved_user ON saved_events(user_id);

CREATE TABLE event_attendees (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  event_uid   TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, event_uid)
);

CREATE INDEX idx_attendees_event ON event_attendees(event_uid);
CREATE INDEX idx_attendees_user  ON event_attendees(user_id);

CREATE TABLE notification_prefs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  expo_push_token   TEXT        NOT NULL,
  categories        TEXT[]      DEFAULT ARRAY['all'],
  morning_alerts    BOOLEAN     DEFAULT true,
  evening_alerts    BOOLEAN     DEFAULT true,
  is_active         BOOLEAN     DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- ▶▶▶ BLOCK 1 END ◀◀◀
```

✅ Verify: Go to Table Editor — you should see 4 tables: `events`, `saved_events`, `event_attendees`, `notification_prefs`.

---

**Run Block 2 of 3 — Trigger (attendee count)**
New query. Copy and run everything between START and END.

```sql
-- ▶▶▶ BLOCK 2 START — TRIGGER ◀◀◀

CREATE OR REPLACE FUNCTION update_attendee_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE events SET attendee_count = attendee_count + 1
    WHERE uid = NEW.event_uid;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE events SET attendee_count = GREATEST(attendee_count - 1, 0)
    WHERE uid = OLD.event_uid;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_attendee_count
AFTER INSERT OR DELETE ON event_attendees
FOR EACH ROW EXECUTE FUNCTION update_attendee_count();

-- ▶▶▶ BLOCK 2 END ◀◀◀
```

✅ Verify: Supabase → Database → Functions — you should see `update_attendee_count`.

---

**Run Block 3 of 3 — Row Level Security**
New query. Copy and run everything between START and END.

```sql
-- ▶▶▶ BLOCK 3 START — ROW LEVEL SECURITY ◀◀◀

ALTER TABLE events              ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees     ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_prefs  ENABLE ROW LEVEL SECURITY;

-- Events: anyone can read (app browsing is open)
CREATE POLICY "Public read events"
  ON events FOR SELECT USING (true);

-- Saved events: each user sees only their own rows
CREATE POLICY "Users manage own saved events"
  ON saved_events FOR ALL USING (auth.uid() = user_id);

-- Attendees: public read (attendee count visible to all), user manages own row
CREATE POLICY "Public read attendees"
  ON event_attendees FOR SELECT USING (true);
CREATE POLICY "Users insert own attendance"
  ON event_attendees FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own attendance"
  ON event_attendees FOR DELETE USING (auth.uid() = user_id);

-- Notification prefs: user manages own row
CREATE POLICY "Users manage own prefs"
  ON notification_prefs FOR ALL USING (auth.uid() = user_id);

-- Edge functions use the service_role key which bypasses RLS entirely

-- ▶▶▶ BLOCK 3 END ◀◀◀
```

✅ Verify: Supabase → Authentication → Policies — each table should show its policies listed.

### 1D · Supabase Auth Configuration

Supabase Dashboard → **Authentication → Providers**:

| Provider | Setting |
|---|---|
| Email | Enable ✅ · "Confirm email" → **OFF** |
| Google | Leave disabled for now — configure before launch |
| Apple | Leave disabled for now — configure before launch |

Supabase Dashboard → **Authentication → URL Configuration**:
- Add to "Redirect URLs": `huballen://auth/callback`

### 1E · Supabase Edge Function Secrets

After Agent 1 deploys the edge functions (step in their section), go to:
**Supabase → Settings → Edge Functions → Secrets → Add new secret**

| Secret name | Value |
|---|---|
| `ICAL_URL` | `https://timelyapp.time.ly/api/calendars/54718021/export?format=ics&target=copy` |
| `SUPABASE_SERVICE_ROLE_KEY` | your service_role key from Settings → API |

> No `CRON_SECRET` needed — Supabase native cron calls edge functions internally, not over HTTP.

### 1F · Native Cron Setup (Supabase pg_cron)

**After Agent 1 deploys edge functions**, run this in Supabase SQL Editor:

```sql
-- ▶▶▶ CRON SETUP — run after edge functions are deployed ◀◀◀

-- Enable the pg_cron extension (may already be enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Job 1: Sync iCal every hour
SELECT cron.schedule(
  'sync-hub-events',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/sync-events',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Job 2: Morning alert — 10am CST = 15:00 UTC, weekends only (cron handles day filter)
SELECT cron.schedule(
  'hub-notify-morning',
  '0 15 * * 6,0',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/send-notifications?window=morning',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Job 3: Evening alert — 4pm CST = 21:00 UTC, every day
SELECT cron.schedule(
  'hub-notify-evening',
  '0 21 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/send-notifications?window=evening',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ▶▶▶ CRON SETUP END ◀◀◀
```

✅ Verify: Supabase → Database → Extensions → confirm `pg_cron` is listed as active.
✅ Verify: Supabase → Database → Cron Jobs — 3 jobs should appear.

### 1G · Assets to Drop Into Repo

Download these and place in the repo before or alongside Agent 1's work.

```
assets/
├── images/
│   ├── hub-logo-white.png     ← right-click Hub logo on hubofficial.com dark header → Save
│   └── hub-logo-dark.png      ← same logo on a light bg if available, else duplicate white
└── restaurants/
    ├── rest-crave.jpg          ← hubofficial.com/wp-content/uploads/2024/12/RestaurantFeaturesForWebCrave.jpg
    ├── rest-local-smoke.jpg    ← .../2024/01/RestaurantFeaturesForWebLocalSmoke2.jpg
    ├── rest-macho-taco.jpg     ← .../2024/01/RestaurantFeaturesForWebMacho.jpg
    ├── rest-amore.jpg          ← .../2024/01/RestaurantFeaturesForWebAmore.jpg
    ├── rest-reds.jpg           ← .../2024/10/RestaurantFeaturesForWebReds-1.jpg
    ├── rest-zukku.jpg          ← .../2025/10/Zukky.jpg
    ├── rest-clubhouse.jpg      ← .../2026/02/RestaurantFeaturesForWebClubhouse-1024x1024.jpg
    ├── rest-super-freeze.jpg   ← .../2023/03/RestaurantFeaturesForWebFreeze.jpg
    ├── rest-spout.jpg          ← .../2023/02/RestaurantFeaturesForWebSpout.jpg
    └── rest-spoke.jpg          ← .../2023/02/RestaurantFeaturesForWebSpoke.jpg
```

Agents use CDN URLs as fallback until local assets are provided.

### 1H · GitHub Repo

Create an empty repo named `hub-allen-app`. Agent 1 runs `create-expo-app` inside it.

---

## ═══════════════════════════════════════════
## SECTION 2 — TECH STACK REFERENCE
## (Read-only context for all agents)
## ═══════════════════════════════════════════

| Layer | Choice | Notes |
|---|---|---|
| Framework | React Native + Expo SDK 52 | Cross-platform, EAS builds |
| Navigation | Expo Router (file-based) | Deep link ready, file = route |
| State | Zustand | 3 stores: events, auth, attendance |
| Backend | Supabase free tier | Postgres + Edge Functions + Auth |
| Edge functions | Deno (TypeScript) | Deployed via Supabase CLI |
| iCal parsing | `npm:node-ical` + `npm:rrule` | RRULE expansion for recurring events |
| Auth | Supabase Auth | Magic link now · Google/Apple before launch |
| Push | Expo Push Notification Service | Wraps FCM + APNs |
| Bottom sheet | `@gorhom/bottom-sheet` | LoginSheet, InviteModal |
| Styling | NativeWind + constants | Hub brand palette, see design spec |
| Cron | Supabase pg_cron | Native — no external service |
| Fonts | @expo-google-fonts | Playfair Display + DM Sans |

---

## ═══════════════════════════════════════════
## SECTION 3 — SHARED DATA CONTRACTS
## (All agents must understand these)
## ═══════════════════════════════════════════

### Types — `/types/index.ts` (written by Agent 1, read-only for all others)

```typescript
export type EventCategory =
  | 'sports' | 'trivia' | 'food_drink' | 'live_music'
  | 'movies' | 'entertainment' | 'general';

export interface Event {
  id: string;
  uid: string;
  summary: string;
  category: EventCategory;
  start_at: string;          // ISO string, CST timezone
  end_at: string;
  image_url: string | null;
  event_url: string | null;
  cost_type: 'free' | 'paid';
  is_recurring: boolean;
  attendee_count: number;
}

export interface NotificationPrefs {
  id: string;
  user_id: string;
  expo_push_token: string;
  categories: EventCategory[] | ['all'];
  morning_alerts: boolean;   // 10am weekends
  evening_alerts: boolean;   // 4pm daily
  is_active: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}
```

### Stores — written by Agent 1, imported by all others

**`/stores/eventsStore.ts`**
```typescript
interface EventsStore {
  tonightEvents: Event[];
  upcomingEvents: Event[];
  selectedCategory: EventCategory | 'all';
  isLoading: boolean;
  fetchTonight: () => Promise<void>;
  fetchUpcoming: (category?: EventCategory) => Promise<void>;
  setCategory: (category: EventCategory | 'all') => void;
}
```

**`/stores/authStore.ts`**
```typescript
interface AuthStore {
  session: Session | null;
  user: UserProfile | null;
  isLoading: boolean;
  loginSheetVisible: boolean;
  loginSheetOnSuccess: (() => void) | null;
  setSession: (session: Session | null) => void;
  openLoginSheet: (onSuccess?: () => void) => void;
  closeLoginSheet: () => void;
  signOut: () => Promise<void>;
}
```

**`/stores/attendanceStore.ts`**
```typescript
interface AttendanceStore {
  attendingUids: Set<string>;
  savedUids: Set<string>;
  loadUserData: (userId: string) => Promise<void>;
  toggleAttendance: (eventUid: string, event: Event) => Promise<void>;
  toggleSaved: (eventUid: string) => Promise<void>;
}
```

### API — `/lib/api.ts` (written by Agent 1)

```typescript
// Wraps calls to the get-events edge function
fetchTonightEvents(): Promise<Event[]>
fetchUpcomingEvents(category?: EventCategory, page?: number): Promise<Event[]>
```

### Category Derivation — `/supabase/functions/_shared/categoryUtils.ts`

Used only inside edge functions. Derives category from event title string.

```typescript
export type EventCategory = 'sports'|'trivia'|'food_drink'|'live_music'|'movies'|'entertainment'|'general';

const RULES: [string[], EventCategory][] = [
  [['watch party','nhl','nba','nfl','mlb','rangers','cowboys','mavs',
    'mavericks','astros','playoff','spurs','hockey','basketball'], 'sports'],
  [['trivia'], 'trivia'],
  [['taco','mimosa','brunch','breakfast','bogo','burger',
    'happy hour','bloody','margarita','wing'], 'food_drink'],
  [['live music','band','concert','acoustic','dj set'], 'live_music'],
  [['movie','film','outdoor movie','cinema'], 'movies'],
  [['karaoke','bingo','game night','comedy','dj dance'], 'entertainment'],
];

export function deriveCategory(summary: string): EventCategory {
  const s = summary.toLowerCase();
  for (const [keywords, cat] of RULES) {
    if (keywords.some(kw => s.includes(kw))) return cat;
  }
  return 'general';
}
```

---

## ═══════════════════════════════════════════
## SECTION 4 — EDGE FUNCTION SPECS
## (Agent 1 implements all three)
## ═══════════════════════════════════════════

### `sync-events` — `/supabase/functions/sync-events/index.ts`

**Triggered by:** Supabase pg_cron every hour (internal — no auth header needed)

**Logic:**
```
1. Fetch ICAL_URL from Deno.env → raw ICS text
2. Parse with node-ical
3. For each VEVENT:
   a. Extract: uid, summary, description, dtstart, dtend,
      image_url (X-WP-IMAGES-URL), cost_type (X-COST-TYPE),
      event_url (URL field), rrule
   b. category = deriveCategory(summary)
   c. If RRULE: expand occurrences for next 90 days using rrule library
      uid per occurrence = `{original_uid}_{dtstart.toISOString()}`
      is_recurring = true
   d. If no RRULE: uid = original, is_recurring = false
4. Upsert all events (INSERT ON CONFLICT uid DO UPDATE)
5. Deactivate stale future events not in this sync batch:
   UPDATE events SET is_active = false
   WHERE uid NOT IN (...synced uids) AND start_at > now()
6. Return JSON: { synced: N, deactivated: M }
```

**Key imports:**
```typescript
import ical from 'npm:node-ical';
import { RRule } from 'npm:rrule';
import { createClient } from 'npm:@supabase/supabase-js';
// Use Deno.env.get('SUPABASE_URL') and Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
// These are auto-injected by Supabase — no manual secret needed for these two
```

---

### `get-events` — `/supabase/functions/get-events/index.ts`

**Triggered by:** React Native app (GET request via Supabase client)

**Query parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `date` | YYYY-MM-DD | today CST | Start date |
| `days` | integer | 1 | Days forward |
| `category` | string | all | Filter by category |
| `limit` | integer | 50 | Max results |

**Response shape:**
```json
{
  "events": [
    {
      "id": "uuid",
      "uid": "abc123",
      "summary": "Rangers Watch Party",
      "category": "sports",
      "start_at": "2026-05-03T18:00:00-05:00",
      "end_at": "2026-05-03T23:59:59-05:00",
      "image_url": "https://timelyapp-prod.s3.amazonaws.com/...",
      "event_url": "https://events.timely.fun/...",
      "cost_type": "free",
      "is_recurring": false,
      "attendee_count": 14
    }
  ],
  "count": 1,
  "date": "2026-05-03"
}
```

---

### `send-notifications` — `/supabase/functions/send-notifications/index.ts`

**Triggered by:** Supabase pg_cron (internal — no auth header needed)

**Query param:** `window=morning` or `window=evening`

**Logic:**
```
1. Read ?window param
2. Get current day in CST (America/Chicago timezone)
3. If window=morning AND today is NOT Saturday or Sunday:
   → return early: { sent: 0, reason: "morning is weekends only" }
4. Time filter:
   morning → events where CST hour(start_at) < 15  (before 3pm)
   evening → events where CST hour(start_at) >= 15 (3pm onwards)
5. Fetch today's events in that window from events table (is_active = true)
6. If no events → return { sent: 0, reason: "no events in window" }
7. Fetch subscribers from notification_prefs where:
   is_active = true
   AND (window=morning → morning_alerts=true | window=evening → evening_alerts=true)
8. For each subscriber:
   a. Filter events by subscriber.categories
      (['all'] → include everything)
   b. Build push message:
      morning title: "Good morning! HUB has plans ☀️"
      evening title: "Tonight at The HUB 🍻"
      body: top 2 events joined, e.g. "Rangers Watch Party 6pm · Trivia 7pm"
      data: { screen: "tonight" }
9. POST to Expo Push API in batches of 100:
   https://exp.host/--/api/v2/push/send
10. Return { sent: N, failed: M, window }
```

---

## ═══════════════════════════════════════════
## SECTION 5 — AGENT 1 · FOUNDATION
## ═══════════════════════════════════════════

**Tool:** Claude Code
**Branch:** `main` (works directly, everyone else branches off this)
**Blocks all other agents — do not start Agents 2–7 until Agent 1 merges**
**Estimated time:** 4–5 hours

### What You Own

```
hub-app/
├── assets/                              ← create folder structure, add placeholders
│   ├── images/hub-logo-white.png
│   ├── images/hub-logo-dark.png
│   └── restaurants/                     ← empty, owner will populate
├── constants/
│   ├── colors.ts                        ← exact values from design spec
│   ├── typography.ts
│   ├── spacing.ts
│   └── shadows.ts
├── types/index.ts
├── lib/
│   ├── supabase.ts                      ← client with expo-secure-store persistence
│   └── api.ts                           ← fetchTonightEvents, fetchUpcomingEvents
├── stores/
│   ├── eventsStore.ts
│   ├── authStore.ts
│   └── attendanceStore.ts
├── components/
│   ├── EventCard.tsx
│   ├── CategoryBadge.tsx
│   ├── LoadingCard.tsx
│   └── AttendButton.tsx
├── app/
│   ├── _layout.tsx                      ← root layout, font loading, auth listener
│   ├── auth/callback.tsx                ← magic link deep link handler
│   └── (tabs)/_layout.tsx              ← tab navigator shell
├── supabase/functions/
│   ├── _shared/categoryUtils.ts
│   ├── sync-events/index.ts
│   ├── get-events/index.ts
│   └── send-notifications/index.ts
├── tailwind.config.js
├── app.json                             ← scheme: "huballen"
├── package.json
├── tsconfig.json
└── .env.example
```

**You do NOT implement any tab screens — those belong to Agents 2, 3, 4, 5, 6, 7.**

### Step-by-Step Instructions

```
Step 1 — Bootstrap
  npx create-expo-app hub-allen-app --template expo-template-blank-typescript
  cd hub-allen-app
  git init && git remote add origin <github repo url>

Step 2 — Install dependencies
  npx expo install expo-router expo-secure-store expo-notifications
  npx expo install expo-device expo-constants expo-calendar
  npx expo install expo-clipboard expo-image expo-auth-session
  npm install @supabase/supabase-js zustand nativewind
  npm install @gorhom/bottom-sheet react-native-reanimated react-native-gesture-handler
  npx expo install @expo-google-fonts/playfair-display @expo-google-fonts/dm-sans

Step 3 — Configure
  • app.json: set name="Hub Allen", slug="hub-allen", scheme="huballen"
  • tailwind.config.js: Hub brand colors + font extensions (see design spec)
  • tsconfig.json: add paths alias "@/*": ["./*"]

Step 4 — Constants (copy exact values from hub-app-design-spec.md)
  • constants/colors.ts
  • constants/typography.ts
  • constants/spacing.ts
  • constants/shadows.ts

Step 5 — Supabase client
  • lib/supabase.ts — use expo-secure-store adapter for auth token persistence
  • lib/api.ts — fetchTonightEvents() and fetchUpcomingEvents() wrappers

Step 6 — Types and stores
  • types/index.ts — Event, NotificationPrefs, UserProfile, EventCategory
  • stores/eventsStore.ts
  • stores/authStore.ts
  • stores/attendanceStore.ts

Step 7 — Shared components
  • components/EventCard.tsx — see design spec for exact sizing
  • components/CategoryBadge.tsx — color mapping from design spec
  • components/LoadingCard.tsx — skeleton placeholder
  • components/AttendButton.tsx — reads authStore, calls toggleAttendance,
    calls authStore.openLoginSheet() if not logged in

Step 8 — App layout and auth callback
  • app/_layout.tsx — load Playfair Display + DM Sans fonts, Supabase auth
    listener (onAuthStateChange → authStore.setSession), wrap with GestureHandlerRootView
  • app/auth/callback.tsx — reads URL from Expo Linking,
    calls supabase.auth.exchangeCodeForSession(), sets session,
    fires loginSheetOnSuccess() if present, navigates to /(tabs)/
  • app/(tabs)/_layout.tsx — tab bar shell with Tonight / Upcoming / Profile tabs
    using Hub design spec (dark green active, gold dot indicator)

Step 9 — Edge functions
  • supabase/functions/_shared/categoryUtils.ts
  • supabase/functions/sync-events/index.ts
  • supabase/functions/get-events/index.ts
  • supabase/functions/send-notifications/index.ts

Step 10 — Deploy edge functions
  npx supabase login
  npx supabase link --project-ref <your-project-ref>
  npx supabase functions deploy sync-events
  npx supabase functions deploy get-events
  npx supabase functions deploy send-notifications

Step 11 — Set edge function secrets in Supabase dashboard
  ICAL_URL = https://timelyapp.time.ly/api/calendars/54718021/export?format=ics&target=copy
  SUPABASE_SERVICE_ROLE_KEY = <your service role key>
  (SUPABASE_URL is auto-injected by Supabase — no need to set it)

Step 12 — Test sync
  In Supabase dashboard → Edge Functions → sync-events → Invoke
  Then check the events table — you should see Hub events populated

Step 13 — Commit and push to main
  git add . && git commit -m "feat: foundation, edge functions, shared components"
  git push origin main
  ← This is the go signal. Notify the project owner, who will start Agents 2–7.
```

### Agent 1 Claude Code Prompt

Paste this into Claude Code to start:

> "I'm building a React Native Expo app called Hub Allen. Your job is the complete project foundation — no screens. Start by reading hub-app-design-spec.md so all constants exactly match the Hub brand. Then follow the step-by-step instructions in hub-app-blueprint-v4.md → Agent 1 section precisely. Key requirements: Expo SDK 52, Expo Router with scheme 'huballen', Supabase client with expo-secure-store auth persistence, three Zustand stores (eventsStore / authStore / attendanceStore), four shared components (EventCard / CategoryBadge / LoadingCard / AttendButton), all constants files from the design spec, the auth callback route at app/auth/callback.tsx, three Supabase edge functions (sync-events parses iCal + expands RRULE for 90 days / get-events REST API / send-notifications with morning+evening windows). Deploy all three edge functions with Supabase CLI. When done, run sync-events manually to verify events appear in the Supabase table, then commit and push to main."

---

## ═══════════════════════════════════════════
## SECTION 6 — AGENTS 2–7 · SCREENS & COMPONENTS
## (Start only after Agent 1 merges to main)
## ═══════════════════════════════════════════

**Before writing a single line of UI code:** `git pull origin main`, then read `hub-app-design-spec.md` in full. Your colors, font sizes, padding, and border radii must match it exactly. When in doubt, open `hub-app-mockup-v2.html` in a browser — that is the visual source of truth.

**The rule:** You own exactly the files listed in your section. Everything else is read-only.

---

### Agent 2 — Tonight Screen

**Branch:** `feat/tonight`
**File:** `app/(tabs)/index.tsx` (yours exclusively)
**Imports freely from:** eventsStore, EventCard, LoadingCard, Colors, Fonts, Spacing

**What to build:**

The home tab. When the app opens, this is the first thing a user sees.

**Screen layout (top to bottom):**
1. **Header strip** — dark green (`Colors.hubDark`) background, Hub logo centered (asset: `assets/images/hub-logo-white.png`, fallback text "THE HUB"), "TONIGHT" label left, today's date right
2. **FeaturedEventCard** — the first event from `tonightEvents` by `start_at`. Full spec in design spec → FeaturedEventCard. Shows: hero image, "⭐ Featured" badge, time badge, category, bold title, avatar stack + going count, AttendButton
3. **"Signature Events" horizontal scroll** — hardcoded list of Hub's 4 recurring event types: DJ Dance Party, HUB Movie Night, Live Music Fridays, Trivia Night. Use gradient backgrounds + emoji fallback. These are marketing cards, not tappable to a detail screen
4. **"Also Tonight" section header** — remaining events in `tonightEvents` (index 1 onwards) as compact EventCard rows
5. **Restaurant strip** — dark green band at bottom, "DINING AT THE HUB" label, horizontal FlatList of restaurant chips. Chip = restaurant photo + name. Restaurant list and CDN URLs in design spec

**Behavior:**
- Call `eventsStore.fetchTonight()` on mount
- Show 3 `LoadingCard` placeholders while `isLoading` is true
- Pull-to-refresh calls `fetchTonight()` again
- Empty state: Hub logo + "Nothing on tonight — check back tomorrow"
- Tapping any EventCard navigates to `/event/[id]`
- Status bar: `light-content` (dark header)

**Prompt for Claude Code:**
> "Read hub-app-design-spec.md and hub-app-mockup-v2.html (Screen 1) before writing any code. Implement the Tonight home tab at app/(tabs)/index.tsx. Use eventsStore (fetchTonight, tonightEvents, isLoading), EventCard, LoadingCard, AttendButton, and all constants from /constants/. Screen layout top to bottom: dark green header with Hub logo + date, FeaturedEventCard for the first event, hardcoded Signature Events horizontal scroll (DJ Dance Party / HUB Movie Night / Live Music Fridays / Trivia Night with gradient cards), 'Also Tonight' section with compact EventCards, restaurant strip in dark green at the bottom. Pull-to-refresh, loading skeletons, empty state. Status bar light-content. Touch nothing outside app/(tabs)/index.tsx."

---

### Agent 3 — Upcoming Events Screen

**Branch:** `feat/events`
**File:** `app/(tabs)/events.tsx` (yours exclusively)
**Imports freely from:** eventsStore, EventCard, LoadingCard, Colors, Fonts, Spacing

**What to build:**

The second tab. Shows events for the next 14 days with category filtering.

**Screen layout:**
1. **Header** — "Upcoming Events" title
2. **Category filter pills** — horizontal ScrollView, non-wrapping. Pills: All · Sports · Trivia · Food & Drink · Live Music · Movies. Active pill: `Colors.hubGreen` background, white text. Inactive: `Colors.creamDark` background, `Colors.textMid` text
3. **SectionList** — events grouped by date, sticky date section headers. Each row is a compact EventCard. Date header format: "Saturday, May 3"
4. **Infinite scroll** — detect bottom of list, fetch next page

**Behavior:**
- On mount: call `eventsStore.fetchUpcoming()`
- Selecting a category pill: call `eventsStore.setCategory(cat)` then `fetchUpcoming(cat)`
- Tapping a card navigates to `/event/[id]`
- Loading state: show skeleton cards

**Prompt for Claude Code:**
> "Read hub-app-design-spec.md before writing any code. Implement the Upcoming Events tab at app/(tabs)/events.tsx. Category filter pills at top (All / Sports / Trivia / Food & Drink / Live Music / Movies — active pill uses Colors.hubGreen). Below: SectionList of events grouped by date with sticky headers, compact EventCard rows. Selecting a pill calls eventsStore.setCategory then fetchUpcoming. Tapping a card navigates to /event/[id]. Infinite scroll at bottom. Loading skeletons. Touch nothing outside app/(tabs)/events.tsx."

---

### Agent 4 — Event Detail Screen

**Branch:** `feat/event-detail`
**File:** `app/event/[id].tsx` (yours exclusively)
**Imports freely from:** eventsStore, attendanceStore, authStore, CategoryBadge, AttendButton, Colors, Fonts, Spacing, Shadows

**What to build:**

The detail view. Opened from any EventCard tap.

**Screen layout (top to bottom):**
1. **Hero image** — full-width, `expo-image`, `contentFit="cover"`, fade transition 300ms. Overlay is a LinearGradient that fades from transparent at top to `Colors.cream` at bottom — no hard edge. Back arrow (←) top-left, save heart (♡/♥) top-right, both floating over the hero
2. **Category badge + free badge** — row below hero
3. **Event title** — PlayfairDisplay_900Black, 24px
4. **Meta rows** — 📅 date, 🕖 time range, 📍 "1289 Johnson Rd, Allen TX"
5. **Divider**
6. **Attendee row** — avatar stack + "{N} people going" + "Be part of the crew" sub-text + AttendButton (right). Count is visible to everyone, no login needed
7. **Divider**
8. **Description** — strip HTML tags, plain text, 12px
9. **Action buttons row** — 3 equal buttons: Directions (opens Maps), Calendar (expo-calendar), Share (system sheet)
10. **"Pair it with dinner" strip** — horizontal chip row of 3 relevant restaurants (Macho Taco, The Spout, Amore)
11. **"RSVP on Eventbrite" button** — visible only if `event.event_url` contains "eventbrite.com"

**Behavior:**
- Read `id` from route params → find event in `eventsStore`
- Save ♡: reads `attendanceStore.savedUids`; if logged out → `authStore.openLoginSheet(() => toggleSaved(uid))`; if logged in → `toggleSaved(uid)`
- Attend: handled by `AttendButton` component (already manages auth check + InviteModal trigger)
- `InviteModal` is imported from `/components/InviteModal.tsx` (Agent 7's file)

**Prompt for Claude Code:**
> "Read hub-app-design-spec.md and hub-app-mockup-v2.html (Screen 2) before writing any code. Implement app/event/[id].tsx. Hero image via expo-image fades into Colors.cream via LinearGradient overlay. Back button top-left, save ♡ top-right (reads attendanceStore.savedUids, triggers authStore.openLoginSheet if not logged in). Category + free badges. Bold 24px title. Meta rows (date/time/address). Attendee count + AttendButton (public, no login to view). Description (strip HTML). 3 action buttons (Directions to 1289 Johnson Rd Allen TX / Calendar / Share). Pair it with dinner chip row. RSVP button only if event_url contains 'eventbrite.com'. Import InviteModal from /components/InviteModal.tsx. Touch nothing outside app/event/[id].tsx."

---

### Agent 5 — Notification Preferences Component

**Branch:** `feat/notifications`
**File:** `components/NotificationPrefs.tsx` (yours exclusively)
**Imports freely from:** lib/supabase, types, Colors, Fonts, Spacing

**What to build:**

A self-contained component that handles push notification setup and preferences. It is rendered inside the Profile screen (Agent 6's work) — you don't touch the profile screen itself.

**Component layout:**
1. **Enable toggle** — "Push Notifications" label + Switch. On first enable: call `expo-notifications` to request permission, get Expo push token, upsert row into `notification_prefs` table
2. **Alert timing toggles** (shown only when enabled):
   - "Evening alerts" (4pm daily) → `evening_alerts` column
   - "Morning alerts" (10am weekends) → `morning_alerts` column
3. **Category checkboxes** (shown only when enabled):
   Everything · Sports · Trivia · Food & Drink · Live Music · Movies
   "Everything" maps to `categories = ['all']`
4. **Save button** — PATCHes the `notification_prefs` row in Supabase

**Behavior:**
- On mount: fetch current prefs from Supabase for the logged-in user, populate state
- User is guaranteed to be authenticated when this renders (parent handles auth)
- Token registration: use `Notifications.getExpoPushTokenAsync()` with `projectId` from `Constants.expoConfig`

**Prompt for Claude Code:**
> "Read hub-app-design-spec.md before writing any code. Build components/NotificationPrefs.tsx — a self-contained component for push notification setup and preferences. It must: request push permission and get the Expo push token using expo-notifications; upsert the token + prefs into the notification_prefs Supabase table; show an enable toggle, two timing toggles (evening_alerts / morning_alerts), category checkboxes (Everything / Sports / Trivia / Food & Drink / Live Music / Movies), and a Save button. Load existing prefs from Supabase on mount. User is already authenticated — don't add any auth logic. Export as default. Touch nothing outside components/NotificationPrefs.tsx."

---

### Agent 6 — Auth + Profile Screen

**Branch:** `feat/auth`
**Files:** `components/LoginSheet.tsx` and `app/(tabs)/profile.tsx` (both yours exclusively)
**Imports freely from:** authStore, attendanceStore, NotificationPrefs (from Agent 5), lib/supabase, Colors, Fonts, Spacing

**What to build — Part A: LoginSheet**

A `@gorhom/bottom-sheet` modal that handles all three auth methods. Has two internal states.

**Idle state:**
```
[drag handle]
[Hub logo — assets/images/hub-logo-dark.png]
"Sign in to save events, mark attendance & get alerts"
[G]  Continue with Google        ← expo-auth-session + Supabase OAuth
[]  Continue with Apple          ← expo-auth-session + Supabase OAuth
──────── or ────────
[email input]
[✉ Send magic link]              ← supabase.auth.signInWithOtp()
"No password needed · Takes 10 seconds"
```

**magic_sent state** (shown after sending magic link):
```
📬
"Check your inbox"
"We sent a link to {email}"
[Resend]  ← disabled for 30 seconds, shows countdown
[Use a different email]  ← resets to idle, clears email
```

**Behavior:**
- Reads `loginSheetVisible`, `loginSheetOnSuccess`, `closeLoginSheet` from `authStore`
- Google + Apple: `supabase.auth.signInWithOAuth({ provider, redirectTo: 'huballen://auth/callback' })`
- Magic link: `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: 'huballen://auth/callback' } })`
- On successful auth from any method: `authStore.setSession()` → `loginSheetOnSuccess?.()` → `closeLoginSheet()`

**What to build — Part B: Profile Screen**

**Logged-out state:**
- Hub logo centered
- "Sign in to save events and get notified"
- Google button, Apple button, email + magic link input (same logic as LoginSheet but inline — no bottom sheet here)

**Logged-in state:**
- User avatar (from `user_metadata.avatar_url`) + display name + email
- `<NotificationPrefs />` component (import from `/components/NotificationPrefs.tsx`)
- "Saved Events" section — list of events from `attendanceStore.savedUids` (load summaries)
- "Sign Out" button → `authStore.signOut()`

**Prompt for Claude Code:**
> "Read hub-app-design-spec.md and the LoginSheet spec in hub-app-blueprint-v4.md before writing any code. Build two files. First: components/LoginSheet.tsx — @gorhom/bottom-sheet modal with idle state (Hub logo, Google button, Apple button, or-divider, email input, Send magic link button) and magic_sent state (📬 icon, email confirmation, 30-second resend countdown, use different email link). Auth via expo-auth-session + Supabase OAuth for Google/Apple; supabase.auth.signInWithOtp for magic link. Redirect URI: huballen://auth/callback. On success: setSession, fire onSuccess callback, close sheet. Second: app/(tabs)/profile.tsx — logged-out state shows inline auth (same options), logged-in state shows user avatar + name, renders <NotificationPrefs /> from /components/NotificationPrefs.tsx, saved events list from attendanceStore.savedUids, sign out button. Touch nothing outside components/LoginSheet.tsx and app/(tabs)/profile.tsx."

---

### Agent 7 — Invite Modal

**Branch:** `feat/invite`
**File:** `components/InviteModal.tsx` (yours exclusively)
**Imports freely from:** types, Colors, Fonts, Spacing

**What to build:**

A modal shown automatically after a user successfully marks attendance. Not a bottom sheet — a centered overlay modal.

**Layout:**
```
[semi-transparent backdrop]
┌──────────────────────────┐
│  🎉                      │
│  You're going!           │
│  Bring your crew?        │
│                          │
│  [f]  Post on Facebook   │
│  [✉]  Invite via SMS     │
│  [⎘]  Copy Link          │
│                          │
│  [Maybe later]           │
└──────────────────────────┘
```

**Props:**
```typescript
interface InviteModalProps {
  visible: boolean;
  event: Event;
  onClose: () => void;
}
```

**Action implementations:**
```typescript
// Facebook
const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(event.event_url)}`;
Linking.openURL(url);

// SMS — pre-filled text, critical for real feel
const time = formatTime(event.start_at);  // e.g. "6:00 PM"
const body = `Hey! I'm going to ${event.summary} at The HUB Allen at ${time}. Come join! ${event.event_url}`;
Linking.openURL(`sms:?body=${encodeURIComponent(body)}`);

// Copy link
await Clipboard.setStringAsync(event.event_url);
// Show brief toast: "Link copied!"
```

**Prompt for Claude Code:**
> "Read hub-app-design-spec.md before writing any code. Build components/InviteModal.tsx. Props: visible (boolean), event (Event from /types/index.ts), onClose (function). Centered overlay modal with semi-transparent backdrop. Shows: 🎉 emoji, 'You're going!' heading, 'Bring your crew?' subtext, three buttons: Post on Facebook (Linking.openURL to FB sharer URL), Invite via SMS (Linking.openURL to sms: with pre-filled message containing event name + formatted time + event_url), Copy Link (expo-clipboard + brief 'Link copied!' toast), and a 'Maybe later' text button. Style with Colors and Fonts from /constants/. Touch nothing outside components/InviteModal.tsx."

---

## ═══════════════════════════════════════════
## SECTION 7 — MERGE RULES
## (Applies to all agents)
## ═══════════════════════════════════════════

| Rule | Detail |
|---|---|
| Agent 1 merges first | No other agent starts until Agent 1 is on `main` |
| Agents 2–7 run in parallel | All branch off `main` after Agent 1 merges |
| Strict file ownership | You own only the files listed in your section — read everything else, modify nothing |
| Agent 5 / Agent 6 coordination | Agent 5 delivers `NotificationPrefs.tsx` as a standalone component. Agent 6 imports it — never edits it |
| PR before merge | Every agent opens a PR. Project owner reviews before merging |
| One merge at a time | Never merge two PRs simultaneously |
| Main must always build | Never merge a branch that fails `npx expo start` |
| Absolute imports | Always use `@/components/...`, `@/stores/...`, `@/constants/...` — never relative paths |

---

## ═══════════════════════════════════════════
## SECTION 8 — ENVIRONMENT VARIABLES
## ═══════════════════════════════════════════

### App `.env` (local, never commit)
```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Supabase Edge Function Secrets
Set in: Supabase Dashboard → Settings → Edge Functions → Secrets
```
ICAL_URL=https://timelyapp.time.ly/api/calendars/54718021/export?format=ics&target=copy
SUPABASE_SERVICE_ROLE_KEY=<your service role key>
```
> `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are also auto-injected by Supabase — the manual secret is a fallback for explicit usage in your function code.

### Supabase Auth (configure in dashboard, not in code)
```
Email provider:   Enabled · Confirm email OFF
Google provider:  Disabled until launch
Apple provider:   Disabled until launch
Redirect URL:     huballen://auth/callback
```

---

## ═══════════════════════════════════════════
## SECTION 9 — FOLDER STRUCTURE
## ═══════════════════════════════════════════

```
hub-allen-app/
│
├── assets/
│   ├── images/
│   │   ├── hub-logo-white.png            # Agent 1 placeholder → owner replaces
│   │   └── hub-logo-dark.png             # Agent 1 placeholder → owner replaces
│   └── restaurants/                      # owner populates from Hub CDN
│
├── constants/                            # Agent 1 — read-only for all others
│   ├── colors.ts
│   ├── typography.ts
│   ├── spacing.ts
│   └── shadows.ts
│
├── types/
│   └── index.ts                          # Agent 1 — read-only for all others
│
├── lib/                                  # Agent 1 — read-only for all others
│   ├── supabase.ts
│   └── api.ts
│
├── stores/                               # Agent 1 — read-only for all others
│   ├── eventsStore.ts
│   ├── authStore.ts
│   └── attendanceStore.ts
│
├── components/                           # Agent 1 builds 4; others add their own
│   ├── EventCard.tsx                     # Agent 1
│   ├── CategoryBadge.tsx                 # Agent 1
│   ├── LoadingCard.tsx                   # Agent 1
│   ├── AttendButton.tsx                  # Agent 1
│   ├── NotificationPrefs.tsx             # Agent 5
│   ├── LoginSheet.tsx                    # Agent 6
│   └── InviteModal.tsx                   # Agent 7
│
├── app/
│   ├── _layout.tsx                       # Agent 1
│   ├── auth/
│   │   └── callback.tsx                  # Agent 1
│   ├── (tabs)/
│   │   ├── _layout.tsx                   # Agent 1
│   │   ├── index.tsx                     # Agent 2 — Tonight
│   │   ├── events.tsx                    # Agent 3 — Upcoming
│   │   └── profile.tsx                   # Agent 6 — Profile
│   └── event/
│       └── [id].tsx                      # Agent 4 — Event Detail
│
├── supabase/
│   └── functions/
│       ├── _shared/
│       │   └── categoryUtils.ts          # Agent 1
│       ├── sync-events/
│       │   └── index.ts                  # Agent 1
│       ├── get-events/
│       │   └── index.ts                  # Agent 1
│       └── send-notifications/
│           └── index.ts                  # Agent 1
│
├── .env                                  # never commit
├── .env.example
├── app.json
├── tailwind.config.js
├── package.json
└── tsconfig.json
```

---

## ═══════════════════════════════════════════
## SECTION 10 — DEMO CHECKLIST
## ═══════════════════════════════════════════

**App**
- [ ] `npx expo start` — zero errors, zero warnings
- [ ] Tonight screen loads with real Hub events and real images
- [ ] Signature Events strip shows all 4 (DJ / Movie / Live Music / Trivia)
- [ ] Restaurant strip shows all 10 with photos
- [ ] Upcoming screen category filter re-fetches correctly
- [ ] Event detail hero fades into cream (no hard edge)
- [ ] Attendee count visible to logged-out user
- [ ] Tapping I'm Attending when logged out → LoginSheet slides up
- [ ] Magic link email sends and deep links back into app
- [ ] After login: attend action completes automatically
- [ ] InviteModal appears after marking attending
- [ ] SMS invite pre-fills event name + time + link
- [ ] Facebook share opens FB app or browser
- [ ] Copy link shows toast
- [ ] Save ♡ toggles correctly
- [ ] Profile shows saved events after login

**Backend**
- [ ] Events table populated (check Supabase → Table Editor → events)
- [ ] Recurring events expanded (Sunday brunch should appear as many rows)
- [ ] Attendee count updates when row inserted/deleted in event_attendees
- [ ] send-notifications edge function tested manually for both windows
- [ ] Push notification delivered to physical device
- [ ] pg_cron jobs visible in Supabase → Database → Cron Jobs

**Pitch ready**
- [ ] Loom recorded (90 seconds: Tonight screen → tap event → attend → invite modal → push notification demo)
- [ ] Expo Go link or EAS build APK ready to send to Hub ownership

---

*Blueprint v4.0 — Hub Allen App*
*Rewrote from v3.1: Supabase pg_cron replaces cron-job.org entirely, SQL split into 3 labeled runnable blocks, each agent section self-contained for engineers, pre-build setup separated from agent tasks, cron setup SQL added as a separate post-deploy step*
