import { Platform } from 'react-native';

export const avatarColors = [
  '#1CC29F', '#7C5CFF', '#FF6B6B', '#FFB020',
  '#38BDF8', '#F472B6', '#84CC16', '#FB923C',
  '#22D3EE', '#A78BFA',
];

/**
 * Selectable accent themes. Each `action` shade is dark enough that white
 * label text clears WCAG AA (>= 4.5:1) — verified for all six.
 *   primary  bright accent: icons, active text, tints, progress bars
 *   deep     mid shade: emphasis text on light cards
 *   action   filled surfaces (buttons, FAB, active chips) behind white text
 *   gradient hero header, [from, to]
 */
export const accents = {
  teal: {
    id: 'teal',
    label: 'Teal',
    primary: '#1CC29F',
    deep: '#0E9E82',
    action: '#0A8168',
    gradient: ['#1CC29F', '#12A5B0'],
    gradientDark: ['#0E9E82', '#0B6F87'],
  },
  indigo: {
    id: 'indigo',
    label: 'Indigo',
    primary: '#818CF8',
    deep: '#6366F1',
    action: '#5138D6',
    gradient: ['#6366F1', '#8B5CF6'],
    gradientDark: ['#4F46E5', '#6D28D9'],
  },
  ocean: {
    id: 'ocean',
    label: 'Ocean',
    primary: '#38BDF8',
    deep: '#0284C7',
    action: '#0369A1',
    gradient: ['#0EA5E9', '#0E7490'],
    gradientDark: ['#0369A1', '#0E7490'],
  },
  sunset: {
    id: 'sunset',
    label: 'Sunset',
    primary: '#FB923C',
    deep: '#EA580C',
    action: '#C2410C',
    gradient: ['#F97316', '#DB2777'],
    gradientDark: ['#C2410C', '#9D174D'],
  },
  rose: {
    id: 'rose',
    label: 'Rose',
    primary: '#F472B6',
    deep: '#DB2777',
    action: '#BE185D',
    gradient: ['#EC4899', '#9D2FA6'],
    gradientDark: ['#BE185D', '#7E22CE'],
  },
  forest: {
    id: 'forest',
    label: 'Forest',
    primary: '#A3E635',
    deep: '#65A30D',
    action: '#4D7C0F',
    gradient: ['#65A30D', '#15803D'],
    gradientDark: ['#4D7C0F', '#166534'],
  },
};

export const accentList = Object.values(accents);
export const DEFAULT_ACCENT = 'teal';

/** Neutrals are shared across accents; only the accent slots swap. */
const neutralLight = {
  mode: 'light',
  bg: '#F5F7FA',
  bgElevated: '#FFFFFF',
  card: '#FFFFFF',
  cardAlt: '#F1F4F8',
  text: '#0F1A24',
  textMuted: '#67788A',
  textFaint: '#9AA9B8',
  border: '#E3E9F0',
  onAction: '#FFFFFF',
  positive: '#12B886',
  negative: '#F03E3E',
  overlay: 'rgba(15,26,36,0.45)',
  sheet: '#FFFFFF',
  chip: '#EEF2F7',
};

const neutralDark = {
  mode: 'dark',
  bg: '#0B1016',
  bgElevated: '#121A23',
  card: '#141D27',
  cardAlt: '#1B2632',
  text: '#EAF2F8',
  textMuted: '#93A3B4',
  textFaint: '#66768A',
  border: '#22303D',
  onAction: '#FFFFFF',
  positive: '#2BD4A6',
  negative: '#FF6B6B',
  overlay: 'rgba(0,0,0,0.6)',
  sheet: '#141D27',
  chip: '#1B2632',
};

/** Build a full theme from a color mode + accent id. */
export function buildTheme(mode = 'light', accentId = DEFAULT_ACCENT) {
  const a = accents[accentId] || accents[DEFAULT_ACCENT];
  const isDark = mode === 'dark';
  const base = isDark ? neutralDark : neutralLight;
  return {
    ...base,
    accent: a.id,
    primary: a.primary,
    // on light cards the bright accent can wash out, so lean on the deeper shade
    primaryDark: isDark ? a.primary : a.deep,
    action: a.action,
    headerGradient: isDark ? a.gradientDark : a.gradient,
  };
}

export const themes = {
  light: buildTheme('light', DEFAULT_ACCENT),
  dark: buildTheme('dark', DEFAULT_ACCENT),
};

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 };
export const spacing = (n) => n * 4;

/**
 * Colored glow for filled accent surfaces (FAB, primary button, active chip).
 * Keeping one definition means same-colored surfaces read as the same shade —
 * a flat fill next to a glowing one looks like two different colors.
 */
export const accentGlow = (color, elevation = 12) =>
  Platform.select({
    web: { boxShadow: `0 ${elevation / 2}px ${elevation * 1.35}px ${color}59` },
    ios: {
      shadowColor: color,
      shadowOpacity: 0.35,
      shadowRadius: elevation * 1.1,
      shadowOffset: { width: 0, height: elevation / 2 },
    },
    default: { elevation: Math.round(elevation / 2) },
  });

export const shadow = (elevation = 8, color = '#0B1016') =>
  Platform.select({
    web: { boxShadow: `0 ${elevation / 2}px ${elevation * 1.6}px rgba(11,16,22,0.12)` },
    ios: {
      shadowColor: color,
      shadowOpacity: 0.14,
      shadowRadius: elevation,
      shadowOffset: { width: 0, height: elevation / 2 },
    },
    default: { elevation: elevation / 2 },
  });

export const font = {
  h1: { fontSize: 30, fontWeight: '800', letterSpacing: -0.6 },
  h2: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  h3: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  body: { fontSize: 15, fontWeight: '500' },
  small: { fontSize: 13, fontWeight: '500' },
  tiny: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
};
