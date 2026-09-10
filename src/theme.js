import { Platform } from 'react-native';

export const palette = {
  teal: '#1CC29F',
  tealDeep: '#0E9E82',
  // dark enough that white label text clears WCAG AA (4.82:1)
  tealAction: '#0A8168',
  coral: '#FF6B6B',
  amber: '#FFB020',
  violet: '#7C5CFF',
  sky: '#38BDF8',
  pink: '#F472B6',
  lime: '#84CC16',
};

export const avatarColors = [
  '#1CC29F', '#7C5CFF', '#FF6B6B', '#FFB020',
  '#38BDF8', '#F472B6', '#84CC16', '#FB923C',
  '#22D3EE', '#A78BFA',
];

const light = {
  mode: 'light',
  bg: '#F5F7FA',
  bgElevated: '#FFFFFF',
  card: '#FFFFFF',
  cardAlt: '#F1F4F8',
  text: '#0F1A24',
  textMuted: '#67788A',
  textFaint: '#9AA9B8',
  border: '#E3E9F0',
  primary: palette.teal,
  primaryDark: palette.tealDeep,
  // filled buttons/FAB: deeper teal + white text
  action: palette.tealAction,
  onAction: '#FFFFFF',
  positive: '#12B886',
  negative: '#F03E3E',
  overlay: 'rgba(15,26,36,0.45)',
  sheet: '#FFFFFF',
  chip: '#EEF2F7',
  headerGradient: ['#1CC29F', '#12A5B0'],
};

const dark = {
  mode: 'dark',
  bg: '#0B1016',
  bgElevated: '#121A23',
  card: '#141D27',
  cardAlt: '#1B2632',
  text: '#EAF2F8',
  textMuted: '#93A3B4',
  textFaint: '#66768A',
  border: '#22303D',
  primary: palette.teal,
  primaryDark: palette.tealDeep,
  action: palette.tealAction,
  onAction: '#FFFFFF',
  positive: '#2BD4A6',
  negative: '#FF6B6B',
  overlay: 'rgba(0,0,0,0.6)',
  sheet: '#141D27',
  chip: '#1B2632',
  headerGradient: ['#0E9E82', '#0B6F87'],
};

export const themes = { light, dark };

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 };
export const spacing = (n) => n * 4;

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
