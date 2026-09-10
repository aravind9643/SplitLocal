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
