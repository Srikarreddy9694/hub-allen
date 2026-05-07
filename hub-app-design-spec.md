# Hub Allen App — Design Spec
**For coding agents. Reference alongside hub-app-blueprint-v3.md.**
**Visual reference: hub-app-mockup-v2.html (open in browser to see all 3 screens)**

---

## Assets You Will Receive From the Client

| Asset | Filename to expect | Where to place |
|---|---|---|
| Hub logo (white version for dark header) | `hub-logo-white.png` | `assets/images/hub-logo-white.png` |
| Hub logo (dark version for light sheet/profile) | `hub-logo-dark.png` | `assets/images/hub-logo-dark.png` |
| Restaurant photos (up to 10 JPGs) | `rest-crave.jpg`, `rest-local-smoke.jpg`, etc. | `assets/restaurants/` |
| Any additional event imagery | provided separately | `assets/events/` |

> Until assets arrive, use the fallback text "THE HUB" in Playfair Display 900 weight.
> Restaurant images: load from Hub CDN URLs listed in the Restaurants section below.
> Event images: load from `image_url` field in the events API response (S3 CDN).

---

## Color Palette

Copy these exact values into `/constants/colors.ts` and use them everywhere.
Never use hardcoded hex strings outside this file.

```typescript
// /constants/colors.ts

export const Colors = {
  // Brand core
  hubDark:      '#0B1D13',   // header, nav bar, dark sections
  hubGreen:     '#1A3622',   // primary buttons, attend CTA, active tab
  hubGold:      '#C8962A',   // accent, category labels, magic link button, active dot
  hubGoldLight: '#F0DFA8',   // category badge background
  hubGoldTint:  '#F5E9C8',   // hover state, light gold areas

  // Backgrounds
  cream:        '#F5EFE4',   // app-wide page background
  creamDark:    '#EDE5D0',   // card warm bg, action button bg, input bg
  white:        '#FFFFFF',   // cards, tab bar, bottom sheets

  // Text
  textDark:     '#0F1C14',   // primary text, event titles
  textMid:      '#4A5E4F',   // secondary text, descriptions, meta
  textLight:    '#8E9E90',   // tertiary, muted labels, timestamps

  // Borders & dividers
  border:       '#D9D0BC',   // card borders, dividers, input borders

  // Semantic (category badges)
  sportsGreen:  '#E8F2EC',   // sports free pill bg
  sportsText:   '#1A4A28',   // sports free pill text
  goldBadgeBg:  '#F0DFA8',   // category badge bg
  goldBadgeTxt: '#7A5A08',   // category badge text

  // Category card gradients (use as LinearGradient colors)
  gradSports:   ['#0D2B1A', '#1F5C36'],
  gradDJ:       ['#1A0A3A', '#4A2080'],
  gradMovie:    ['#0A1A30', '#1A4060'],
  gradMusic:    ['#1A2A0A', '#3A6010'],
  gradTrivia:   ['#2A1A0A', '#6A4020'],
  gradTaco:     ['#7A3A10', '#C87830'],
} as const;
```

---

## Typography

```typescript
// /constants/typography.ts

export const Fonts = {
  display:  'PlayfairDisplay_800ExtraBold',  // event titles, hero text
  displayBold: 'PlayfairDisplay_900Black',   // logo fallback, screen titles
  body:     'DMSans_400Regular',             // body text, descriptions
  bodyMed:  'DMSans_500Medium',              // labels, nav items
  bodySemi: 'DMSans_600SemiBold',            // buttons, category text, counts
} as const;

export const FontSizes = {
  xs:    9,    // category badges, timestamps, tiny labels
  sm:    10,   // section headers (uppercase), sub-labels
  base:  11,   // meta text, compact card names, chip labels
  md:    12,   // body text, descriptions, input text, button text
  lg:    13,   // primary button text, sheet buttons
  xl:    14,   // status bar, detail meta rows
  h3:    18,   // compact featured titles
  h2:    20,   // featured card title
  h1:    24,   // event detail title (large)
  logo:  20,   // logo fallback text
} as const;
```

**Install these fonts in app.json and load via `expo-font`:**
```json
"fonts": [
  "PlayfairDisplay_700Bold",
  "PlayfairDisplay_800ExtraBold",
  "PlayfairDisplay_900Black",
  "DMSans_400Regular",
  "DMSans_500Medium",
  "DMSans_600SemiBold"
]
```

```bash
npx expo install @expo-google-fonts/playfair-display @expo-google-fonts/dm-sans
```

---

## Spacing & Border Radius

```typescript
// /constants/spacing.ts

export const Spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  base: 14,   // standard screen horizontal padding
  lg:   18,
  xl:   24,
} as const;

export const Radius = {
  sm:    10,   // pills, compact chips
  md:    14,   // compact cards
  lg:    20,   // featured card, signature cards
  xl:    26,   // bottom sheet corners
  full:  999,  // fully rounded pills, avatar circles
} as const;
```

---

## Screen-by-Screen Component Spec

### Screen 1: Tonight (Home Tab)

**Background:** `Colors.cream`

#### Header strip
```
background:     Colors.hubDark
paddingTop:     14 (below status bar)
paddingBottom:  18
paddingH:       18

Logo: centered, height 38px
  → asset: assets/images/hub-logo-white.png
  → fallback: "THE HUB" in PlayfairDisplay_900Black, color: Colors.hubGold,
    fontSize: 20, letterSpacing: 3.6

Below logo:
  Left:  "TONIGHT"  — 10px, DMSans_600SemiBold, color rgba(255,255,255,0.45),
                       letterSpacing 1.2, UPPERCASE
  Right: "Sat, May 3" — 11px, DMSans_400Regular, color rgba(255,255,255,0.4)
```

#### FeaturedEventCard
```
margin:         14px horizontal, 14px top
borderRadius:   Radius.lg (20)
background:     Colors.white
shadow:         { color: '#0B1D13', offset: {x:0,y:6}, blur: 24, opacity: 0.14 }

Hero image:
  height:         155px
  source:         event.image_url (expo-image, contentFit='cover')
  overlay:        LinearGradient transparent→rgba(0,0,0,0.55) from 35%→100%
  Top-left badge: "⭐ Featured"
    background: Colors.hubGold, color white, 9px DMSans_600SemiBold,
    UPPERCASE letterSpacing 0.7, paddingH 9, paddingV 3, borderRadius Radius.full
  Top-right badge: time string (e.g. "7:00 PM")
    background: rgba(0,0,0,0.42), color white, same sizing

Card body (paddingH 14, paddingV 12):
  Category line:  event.category label — 9px, DMSans_700Bold, Colors.hubGold, UPPERCASE, letterSpacing 1
  Event title:    PlayfairDisplay_800ExtraBold, 20px, Colors.textDark, lineHeight 1.15
  Bottom row (space-between):
    Left:  AvatarStack (3 overlapping circles, -6px offset) + "{N} going" 11px Colors.textMid
    Right: AttendButton → "I'm Attending" or "Going ✓"
      background: Colors.hubGreen, color white, 11px DMSans_600SemiBold,
      paddingH 16, paddingV 8, borderRadius Radius.full
```

#### SectionHeader (reusable)
```
flexDirection: row, justifyContent: space-between, alignItems: center
paddingH: 14, paddingTop: 18, paddingBottom: 8

Title: 10px DMSans_700Bold, UPPERCASE, letterSpacing 1, Colors.textMid
Link:  11px DMSans_500Medium, Colors.hubGold
```

#### SignatureEventCard (horizontal scroll)
```
width:          130px, borderRadius: Radius.lg (20), background: Colors.white
shadow:         { blur: 12, opacity: 0.10, color: '#0B1D13' }

Image section (height 80px):
  LinearGradient (see Colors.grad* per event type)
  Overlay:  LinearGradient transparent→rgba(0,0,0,0.5)
  Day label: bottom-left, 9px DMSans_700Bold white, UPPERCASE, letterSpacing 0.6

Body (padding 8 9 10):
  Name: PlayfairDisplay_700Bold, 12px, Colors.textDark, lineHeight 1.2
  Desc: 9px DMSans_400Regular, Colors.textMid, lineHeight 1.4

Signature event types and their gradient + label:
  DJ Dance Party   → Colors.gradDJ,    "EVERY WEEK"
  HUB Movie Night  → Colors.gradMovie, "WEEKLY"
  Live Music Fri.  → Colors.gradMusic, "FRIDAYS"
  Trivia Night     → Colors.gradTrivia,"THURSDAYS"
  (use event.image_url if available, else gradient fallback)
```

#### CompactEventCard
```
marginH: 14, marginBottom: 10
borderRadius: Radius.md (14), background: Colors.white
shadow: { blur: 10, opacity: 0.07, color: '#0B1D13' }
flexDirection: row, overflow: hidden

Thumbnail (width 70):
  LinearGradient matching category
  Centered emoji (fontSize 28) as fallback

Body (padding 10 12):
  Category: 9px DMSans_700Bold, Colors.hubGold, UPPERCASE, letterSpacing 0.8
  Name:     PlayfairDisplay_700Bold, 13px, Colors.textDark, numberOfLines 1
  Meta row: 10px DMSans_400Regular, Colors.textLight
    • time string
    • FreePill: "FREE" — 9px DMSans_700Bold, bg Colors.sportsGreen, color Colors.sportsText,
                paddingH 6, paddingV 2, borderRadius Radius.full
    • "{N} going"
```

#### RestaurantStrip
```
background:     Colors.hubDark
paddingH:       14, paddingTop: 16, paddingBottom: 18
marginTop:      8

Header: "DINING AT THE HUB" — 10px DMSans_700Bold, rgba(255,255,255,0.4), UPPERCASE, letterSpacing 1.2

Horizontal FlatList:
  Each chip (width 90, borderRadius 12):
    background:   rgba(255,255,255,0.08)
    border:       1px solid rgba(200,150,42,0.25)
    Image: height 52, objectFit cover
    Name: 9px DMSans_600SemiBold, rgba(255,255,255,0.8), textAlign center,
          padding 5 4 6

Restaurant list (use these CDN URLs as default, replace with downloaded assets later):
  Crave        → https://hubofficial.com/wp-content/uploads/2024/12/RestaurantFeaturesForWebCrave.jpg
  Local Smoke  → https://hubofficial.com/wp-content/uploads/2024/01/RestaurantFeaturesForWebLocalSmoke2.jpg
  Macho Taco   → https://hubofficial.com/wp-content/uploads/2024/01/RestaurantFeaturesForWebMacho.jpg
  Amore Pizza  → https://hubofficial.com/wp-content/uploads/2024/01/RestaurantFeaturesForWebAmore.jpg
  Red's        → https://hubofficial.com/wp-content/uploads/2024/10/RestaurantFeaturesForWebReds-1.jpg
  Zukku Sushi  → https://hubofficial.com/wp-content/uploads/2025/10/Zukky.jpg
  Clubhouse    → https://hubofficial.com/wp-content/uploads/2026/02/RestaurantFeaturesForWebClubhouse-1024x1024.jpg
  Super Freeze → https://hubofficial.com/wp-content/uploads/2023/03/RestaurantFeaturesForWebFreeze.jpg
  The Spout    → https://hubofficial.com/wp-content/uploads/2023/02/RestaurantFeaturesForWebSpout.jpg
  The Spoke    → https://hubofficial.com/wp-content/uploads/2023/02/RestaurantFeaturesForWebSpoke.jpg
```

---

### Screen 2: Event Detail

**Background:** `Colors.cream`

#### Hero
```
height: 200px
source: event.image_url via expo-image (objectFit cover)
fallback: LinearGradient Colors.gradSports centered with large category emoji

Overlay: LinearGradient
  [rgba(0,0,0,0.15) at 0%] → [Colors.cream at 100%]
  This fades the hero INTO the page background — no hard edge

Back button (top-left, below status bar):
  width/height 34, borderRadius full
  background: rgba(0,0,0,0.35), color white, fontSize 16 "←"

Save button (top-right, same row):
  same sizing, icon "♡" (unfilled) or "♥" (saved, color Colors.hubGold)
```

#### Content (paddingH 16)
```
Badges row (marginBottom 8, marginTop 2):
  CategoryBadge: bg Colors.goldBadgeBg, text Colors.goldBadgeTxt
  FreeBadge:     bg Colors.sportsGreen, text Colors.sportsText
  Both: 9px DMSans_700Bold, UPPERCASE, letterSpacing 0.9, paddingH 9, paddingV 3, borderRadius full

Event title:
  PlayfairDisplay_900Black, 24px, Colors.textDark, lineHeight 1.1

Meta rows (gap 5, marginBottom 14):
  Each row: icon (fontSize 14, width 18) + text (12px DMSans_400Regular, Colors.textMid)
  📅 date   🕖 time range   📍 address

Divider: height 1, background Colors.border

Attendees row (space-between, marginBottom 14):
  Left: AvatarStack + count column
    Count:    14px DMSans_700Bold, Colors.textDark
    Sub-text: 10px DMSans_400Regular, Colors.textLight "Be part of the crew"
  Right: "I'm Attending" / "Going ✓" button
    background: Colors.hubGreen, color white
    13px DMSans_700Bold, paddingH 20, paddingV 11, borderRadius full

Divider

Description text:
  12px DMSans_400Regular, Colors.textMid, lineHeight 1.65, marginBottom 16

Action buttons row (3 equal flex columns, gap 8):
  Each: background Colors.creamDark, borderRadius 13, padding 11 8
  Icon (fontSize 18) centered above label (9px DMSans_600SemiBold Colors.textMid UPPERCASE letterSpacing 0.4)
  Labels: "DIRECTIONS" | "CALENDAR" | "SHARE"

Divider

"Pair it with dinner" section:
  SectionHeader + horizontal chip row
  Chips: background Colors.creamDark, borderRadius 12, paddingH 12 paddingV 8
  Emoji + restaurant name (11px DMSans_600SemiBold Colors.textDark)
```

---

### Modal: LoginSheet (Bottom Sheet)

**Component library:** `@gorhom/bottom-sheet`

```
Sheet background:   Colors.white
Border radius:      Radius.xl (26) top corners only
Shadow:             0 -10px 40px rgba(0,0,0,0.14)

Drag handle:
  width 36, height 4, borderRadius 2
  background: Colors.border
  alignSelf center, marginBottom 18

Logo:
  asset: assets/images/hub-logo-dark.png, height 30
  fallback: "THE HUB" PlayfairDisplay_900Black, 20px, Colors.hubGreen, letterSpacing 0.16em

Tagline (textAlign center, marginBottom 18):
  "Sign in to save events,\nmark attendance & get alerts"
  12px DMSans_400Regular, Colors.textMid, lineHeight 1.55

Google button:
  background: Colors.cream
  border: 1.5px Colors.border
  color: Colors.textDark
  Icon: "G" in #4285F4, fontSize 15, fontWeight 700

Apple button:
  background: Colors.textDark
  color: Colors.white
  Icon: "" fontSize 15

Both buttons:
  width 100%, paddingV 12, borderRadius 14
  13px DMSans_600SemiBold, gap 10, marginBottom 9

OR divider:
  flexDirection row, alignItems center, marginV 10
  Lines: flex 1, height 1, background Colors.border
  Text: 11px DMSans_400Regular, Colors.textLight

Email input:
  width 100%, paddingH 14, paddingV 11
  borderRadius 12, border 1.5px Colors.border
  background Colors.cream, 12px DMSans_400Regular
  placeholder: "your@email.com"
  marginBottom 8

Magic link button:
  background: Colors.hubGold, color white
  width 100%, paddingV 13, borderRadius 14
  13px DMSans_700Bold, letterSpacing 0.3
  Label: "✉  Send magic link"

Disclaimer (textAlign center, marginTop 10):
  "No password needed · Takes 10 seconds"
  10px DMSans_400Regular, Colors.textLight, lineHeight 1.5
```

---

### Tab Bar

```
height:          64px
background:      Colors.white
borderTop:       1px Colors.border
paddingBottom:   6px (for safe area)
justifyContent:  space-around

Each tab:
  flexDirection: column, alignItems: center, gap: 3, flex: 1

Icon:    fontSize 21
Label:   9px DMSans_500Medium, Colors.textLight, letterSpacing 0.4
Active:  label color Colors.hubGreen, fontWeight DMSans_600SemiBold

Active indicator dot (below active label only):
  width 4, height 4, borderRadius full
  background: Colors.hubGold

Tabs (in order):
  🌙  "Tonight"   (index.tsx)
  📅  "Upcoming"  (events.tsx)
  👤  "Profile"   (profile.tsx)
```

---

### Status Bar

```
Style:  'light-content' when on Tonight header (dark background)
        'dark-content' on all other screens (light background)

Use expo-status-bar <StatusBar style="light"> / "dark" per screen.
```

---

## Reusable Components Reference

### `CategoryBadge` — color mapping
```typescript
const BADGE_CONFIG: Record<EventCategory, { bg: string; text: string; label: string }> = {
  sports:        { bg: '#E8F2EC', text: '#1A4A28', label: 'Sports' },
  trivia:        { bg: '#EDE8F5', text: '#3A1A6A', label: 'Trivia' },
  food_drink:    { bg: Colors.goldBadgeBg, text: Colors.goldBadgeTxt, label: 'Food & Drink' },
  live_music:    { bg: '#E8F5EB', text: '#1A4A20', label: 'Live Music' },
  movies:        { bg: '#E8EEF5', text: '#1A2A4A', label: 'Movies' },
  entertainment: { bg: '#F5EBE8', text: '#4A1A10', label: 'Entertainment' },
  general:       { bg: Colors.creamDark, text: Colors.textMid, label: 'Event' },
};
```

### `AvatarStack`
```typescript
// 3 overlapping circles, each 20x20, border 1.5px white, marginLeft -6
// Colors: ['#1A4A28', '#7A3A10', '#1A3A5C'] cycling
// Followed by "{count} going" in 11px Colors.textMid
```

### `FreePill`
```typescript
// "FREE" text: 9px DMSans_700Bold, UPPERCASE
// bg: Colors.sportsGreen, text: Colors.sportsText
// paddingH 6, paddingV 2, borderRadius Radius.full
```

---

## Image Handling

Always use `expo-image` for all images (not React Native's `<Image>`).

```typescript
import { Image } from 'expo-image';

<Image
  source={{ uri: event.image_url }}
  style={{ width: '100%', height: 155 }}
  contentFit="cover"
  transition={300}         // fade-in on load
  placeholder={blurhash}   // optional: use a dark green blurhash
/>
```

**Fallback for missing images:** Show a `LinearGradient` with the category gradient colors and a centered emoji.

```typescript
// Blurhash placeholder (dark green tone, use for all event images):
const EVENT_BLURHASH = 'L25##O00xus.00WB%Ma}00of~qt7';
```

---

## NativeWind Config

```javascript
// tailwind.config.js
module.exports = {
  content: ['./app/**/*.tsx', './components/**/*.tsx'],
  theme: {
    extend: {
      colors: {
        'hub-dark':   '#0B1D13',
        'hub-green':  '#1A3622',
        'hub-gold':   '#C8962A',
        'cream':      '#F5EFE4',
        'cream-dark': '#EDE5D0',
        'hub-mid':    '#4A5E4F',
        'hub-light':  '#8E9E90',
        'hub-border': '#D9D0BC',
      },
      fontFamily: {
        'playfair': ['PlayfairDisplay_800ExtraBold'],
        'playfair-black': ['PlayfairDisplay_900Black'],
        'sans': ['DMSans_400Regular'],
        'sans-med': ['DMSans_500Medium'],
        'sans-semi': ['DMSans_600SemiBold'],
      },
    },
  },
  plugins: [],
};
```

---

## Shadow Utility

React Native shadows need both iOS and Android handling:

```typescript
// /constants/shadows.ts
export const Shadows = {
  card: {
    shadowColor:   '#0B1D13',
    shadowOffset:  { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius:  24,
    elevation:     8,   // Android
  },
  compact: {
    shadowColor:   '#0B1D13',
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius:  10,
    elevation:     3,
  },
  sheet: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: -10 },
    shadowOpacity: 0.14,
    shadowRadius:  40,
    elevation:     20,
  },
} as const;
```

---

## Visual Reference

Open `hub-app-mockup-v2.html` in a browser to see all three screens:
- **Screen 1:** Tonight home — header, featured card, signature events strip, compact cards, restaurant strip, tab bar
- **Screen 2:** Event detail — hero with fade, badges, attendee row, action buttons, "pair it with dinner"
- **Screen 3:** Login bottom sheet — Google, Apple, email + magic link

When in doubt about spacing, color, or sizing: the mockup is the source of truth.

---

*Design Spec v1.0 — Hub Allen App*
*Companion to hub-app-blueprint-v3.md*
