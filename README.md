# SplitLocal

A shared-expense splitter for groups built with Expo + React Native. **No accounts, no server, no sync** — every byte lives in local device storage (`AsyncStorage`, which is `localStorage` on web).

Runs on **web, Android and iOS** from one codebase.

## Run it

```bash
npm install
npm run web        # browser
npm run android    # Android device/emulator
npm run ios        # iOS simulator (macOS only)
npm start          # dev server, then scan the QR with Expo Go

npm run build      # production web build into dist/ (installable PWA)
npm run icons      # regenerate every app icon from the vector source
```

## Features

**Groups** — trips, flats, couples, work; each with its own members, expenses and balances.

**Expenses** with four split modes:
- **Equally** — remainder cents are distributed so shares always sum to the exact total (₹10 across 3 → 3.34 / 3.33 / 3.33)
- **Exact amounts** — validated to match the total
- **Percentages** — validated to sum to 100%
- **Shares/weights** — e.g. 1:2:3

Any member can be the payer, and participants are individually selectable per expense.

**Balances** — greedy debt simplification reduces who-pays-whom to the minimum number of transfers, including collapsing transitive debts (A owes B, B owes C → A pays C).

**Settle up** — record payments against suggested transfers or any custom pair.

**Totals** — group spending, breakdown by category, and paid-vs-share per person.

**Friends** — per-person net across all groups plus non-group expenses.

**Activity** — unified reverse-chronological feed of every expense and payment.

**Settings** — light/dark/system mode, **6 color themes** (Teal, Indigo, Ocean, Sunset, Rose, Forest), 7 currencies, JSON export, full reset.

## Theming

Two independent axes, both persisted locally:

- **Mode** — light / dark / follow-system
- **Accent** — 6 color themes, each defined once in [src/theme.js](src/theme.js)

`buildTheme(mode, accentId)` composes shared neutrals with the accent's four slots (`primary`, `deep`, `action`, `gradient`), so the accent flows to headers, buttons, the FAB, active chips, tab icons, and progress bars. Adding a seventh theme means adding one entry to `accents` — nothing else.

Every accent's `action` shade (used behind white button labels) is chosen to clear the WCAG AA 4.5:1 contrast threshold; the measured range is 4.82:1–7.28:1. Filled accent surfaces share one `accentGlow()` helper so a flat fill never sits next to a glowing one of the same color and reads as a different shade.

Note: the native splash screen and Android adaptive-icon background are baked in at build time (`app.json`), so they stay teal regardless of the in-app accent.

## PWA (installable web app)

`npm run build` produces an installable, offline-capable PWA in `dist/`. Expo SDK 57 does **not** generate a web manifest or service worker (that went away with `@expo/webpack-config`), so both are maintained here:

| File | Purpose |
| --- | --- |
| `public/manifest.json` | Web app manifest — name, colors, `display: standalone`, icon set incl. a maskable variant |
| `public/index.html` | Overrides Expo's HTML template to link the manifest and the iOS home-screen meta tags. Keeps the `react-native-web` reset and `#root` that Expo requires |
| `public/sw.js` | Offline service worker — network-first for navigations, cache-first for hashed assets |
| `scripts/build-web.mjs` | Runs the export, then stamps `sw.js` with the real asset list |

That last step matters: Metro content-hashes the JS bundle, so its URL is only known after export. Precaching it at install time is what makes the app work offline **after a single visit** — without it the service worker isn't yet controlling the page when the bundle loads, so it takes a second visit before offline works. The cache name is derived from the bundle hash, so each deploy invalidates the previous cache instead of serving a mix of old and new chunks.

Only the Ionicons font is precached; `@expo/vector-icons` ships ~18 other families the app never renders, which are left to cache on demand (2.5 MB precache instead of ~6 MB).

iOS ignores the manifest, so `apple-touch-icon` plus `apple-mobile-web-app-*` tags handle Add to Home Screen there.

## Icons

All six app icons are generated from a single vector source — no binary editing:

```bash
npm run icons     # node scripts/make-icons.mjs
```

The mark is one receipt divided by a vertical cut into two unequal shares, with the line items continuing across the split. It's built as even-odd paths (the cut and line items are real holes, not shapes painted in the background color), so the same geometry works full-bleed, on transparency, and as a flat silhouette.

| Asset | Size | Purpose |
| --- | --- | --- |
| `icon.png` | 1024² | iOS / store icon — alpha flattened, since Apple rejects transparency |
| `favicon.png` | 96² | Web; Expo compiles it into a multi-size `favicon.ico` |
| `splash-icon.png` | 1024² | Splash mark, transparent — sized via the `expo-splash-screen` plugin |
| `android-icon-foreground.png` | 512² | Adaptive icon foreground |
| `android-icon-background.png` | 512² | Adaptive icon background layer |
| `android-icon-monochrome.png` | 432² | Android 13+ themed icons |
| `public/pwa-192.png` | 192² | PWA install icon |
| `public/pwa-512.png` | 512² | PWA install icon / splash |
| `public/pwa-maskable-512.png` | 512² | PWA maskable — art bleeds to the edge for circular crops |
| `public/apple-touch-icon.png` | 180² | iOS Add to Home Screen (opaque) |

The script's `span` parameter means "fraction of the canvas the mark occupies", so the platform sizing rules are expressed directly. The Android foreground sits at ~58×62% — filling the launcher mask while staying inside the 66% safe zone, which `scripts/make-icons.mjs` output and the checks in this repo's history verified against circular and squircle masks.

## Design

Custom UI layer in [src/ui.js](src/ui.js) — gradient headers, spring-press feedback on every tappable, staggered list fade-ins, animated count-up totals, animated progress bars, and slide-up bottom sheets. Haptics on native. Dark mode throughout. On wide browser windows the app centers itself in a phone-width column.

## Layout

| Path | Purpose |
| --- | --- |
| [src/store.js](src/store.js) | State, persistence, and all money math (splitting, balances, debt simplification) |
| [src/ui.js](src/ui.js) | Theme context + reusable animated components |
| [src/theme.js](src/theme.js) | Light/dark palettes, spacing, type scale |
| [src/Root.js](src/Root.js) | Tab navigation, screen transitions, responsive frame |
| [src/ExpenseEditor.js](src/ExpenseEditor.js) | Add/edit expense sheet with the four split modes |
| [src/SettleSheet.js](src/SettleSheet.js) | Record-a-payment sheet |
| [src/screens/](src/screens/) | Groups, group detail, friends, activity, settings |

All amounts are computed in integer cents internally to avoid floating-point drift.
