import React, { createContext, useContext, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  themes,
  buildTheme,
  DEFAULT_ACCENT,
  accentGlow,
  radius,
  font,
  shadow,
} from './theme';
import { colorFor, initials } from './store';

/* ---------------- theme context ---------------- */

const ThemeCtx = createContext(themes.light);
export const useTheme = () => useContext(ThemeCtx);

export function ThemeProvider({ mode, accent = DEFAULT_ACCENT, children }) {
  const system = useColorScheme();
  const resolved = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
  const t = React.useMemo(
    () => buildTheme(resolved === 'dark' ? 'dark' : 'light', accent),
    [resolved, accent]
  );
  return <ThemeCtx.Provider value={t}>{children}</ThemeCtx.Provider>;
}

export const tap = (style = 'light') => {
  if (Platform.OS === 'web') return;
  const map = {
    light: Haptics.ImpactFeedbackStyle.Light,
    medium: Haptics.ImpactFeedbackStyle.Medium,
    heavy: Haptics.ImpactFeedbackStyle.Heavy,
  };
  Haptics.impactAsync(map[style] || map.light).catch(() => {});
};

export const notify = (type = 'success') => {
  if (Platform.OS === 'web') return;
  const map = {
    success: Haptics.NotificationFeedbackType.Success,
    warning: Haptics.NotificationFeedbackType.Warning,
    error: Haptics.NotificationFeedbackType.Error,
  };
  Haptics.notificationAsync(map[type]).catch(() => {});
};

/* ---------------- animation primitives ---------------- */

export function FadeIn({ children, delay = 0, from = 14, duration = 380, style }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
  }, [a, delay, duration]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: a,
          transform: [
            { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Pressable that springs down on press. */
export function Squish({
  children,
  onPress,
  onLongPress,
  style,
  wrapperStyle,
  disabled,
  label,
  scaleTo = 0.965,
  haptic = 'light',
}) {
  const s = useRef(new Animated.Value(1)).current;
  const spring = (to) =>
    Animated.spring(s, { toValue: to, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  return (
    <Pressable
      style={wrapperStyle}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={label}
      onPressIn={() => spring(scaleTo)}
      onPressOut={() => spring(1)}
      onPress={
        onPress
          ? (e) => {
              if (haptic) tap(haptic);
              onPress(e);
            }
          : undefined
      }
      onLongPress={onLongPress}
    >
      <Animated.View style={[style, { transform: [{ scale: s }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/** Number that counts up when its value changes. */
export function AnimatedAmount({ value, format, style }) {
  const anim = useRef(new Animated.Value(value)).current;
  const [display, setDisplay] = React.useState(value);
  useEffect(() => {
    const id = anim.addListener(({ value: v }) => setDisplay(v));
    Animated.timing(anim, {
      toValue: value,
      duration: 640,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => anim.removeListener(id);
  }, [value, anim]);
  return <Text style={style}>{format(display)}</Text>;
}

/** Horizontal bar that animates its width. */
export function ProgressBar({ pct, color, track, height = 8 }) {
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(w, {
      toValue: Math.max(0, Math.min(1, pct)),
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [pct, w]);
  return (
    <View style={{ height, borderRadius: height, backgroundColor: track, overflow: 'hidden' }}>
      <Animated.View
        style={{
          height,
          borderRadius: height,
          backgroundColor: color,
          width: w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }}
      />
    </View>
  );
}

/* ---------------- building blocks ---------------- */

export function Avatar({ id, name, size = 40, ring, style }) {
  const t = useTheme();
  const bg = colorFor(id || name || '');
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: ring ? 2 : 0,
          borderColor: t.card,
        },
        style,
      ]}
    >
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.38 }}>
        {initials(name)}
      </Text>
    </View>
  );
}

export function AvatarStack({ people, size = 28, max = 4 }) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {shown.map((p, i) => (
        <Avatar
          key={p.id}
          id={p.id}
          name={p.name}
          size={size}
          ring
          style={{ marginLeft: i === 0 ? 0 : -size * 0.32 }}
        />
      ))}
      {extra > 0 && (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            marginLeft: -size * 0.32,
            backgroundColor: t.chip,
            borderWidth: 2,
            borderColor: t.card,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: t.textMuted, fontWeight: '800', fontSize: size * 0.34 }}>
            +{extra}
          </Text>
        </View>
      )}
    </View>
  );
}

export function Card({ children, style, onPress, padded = true }) {
  const t = useTheme();
  const body = (
    <View
      style={[
        {
          backgroundColor: t.card,
          borderRadius: radius.lg,
          padding: padded ? 16 : 0,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: t.border,
        },
        shadow(10),
        style,
      ]}
    >
      {children}
    </View>
  );
  return onPress ? <Squish onPress={onPress}>{body}</Squish> : body;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  style,
  disabled,
  loading,
  full,
}) {
  const t = useTheme();
  const variants = {
    primary: { bg: t.action, fg: t.onAction, border: 'transparent' },
    danger: { bg: t.negative, fg: '#fff', border: 'transparent' },
    ghost: { bg: 'transparent', fg: t.text, border: t.border },
    soft: { bg: t.chip, fg: t.text, border: 'transparent' },
  };
  const v = variants[variant] || variants.primary;
  return (
    <Squish
      onPress={onPress}
      disabled={disabled || loading}
      haptic="medium"
      style={[
        {
          backgroundColor: v.bg,
          borderColor: v.border,
          borderWidth: variant === 'ghost' ? 1 : 0,
          paddingVertical: 14,
          paddingHorizontal: 20,
          borderRadius: radius.pill,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: disabled ? 0.45 : 1,
          alignSelf: full ? 'stretch' : 'flex-start',
        },
        variant === 'primary' && accentGlow(v.bg, 10),
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} size="small" />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={v.fg} /> : null}
          <Text style={{ color: v.fg, fontWeight: '700', fontSize: 15 }}>{title}</Text>
        </>
      )}
    </Squish>
  );
}

export function Chip({ label, active, onPress, icon, color }) {
  const t = useTheme();
  const bg = active ? color || t.action : t.chip;
  const fg = active ? '#fff' : t.textMuted;
  return (
    <Squish
      onPress={onPress}
      label={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 9,
        paddingHorizontal: 14,
        borderRadius: radius.pill,
        backgroundColor: bg,
        // same accent glow the FAB/primary button carries, so filled
        // surfaces of the same colour don't read as two different shades
        ...(active ? accentGlow(bg, 8) : null),
      }}
    >
      {icon ? <Ionicons name={icon} size={15} color={fg} /> : null}
      <Text style={{ color: fg, fontWeight: '700', fontSize: 13 }}>{label}</Text>
    </Squish>
  );
}

export function Field({ label, hint, children, style }) {
  const t = useTheme();
  return (
    <View style={[{ gap: 8 }, style]}>
      {label ? (
        <Text style={[font.tiny, { color: t.textFaint, textTransform: 'uppercase' }]}>
          {label}
        </Text>
      ) : null}
      {children}
      {hint ? <Text style={[font.small, { color: t.textFaint }]}>{hint}</Text> : null}
    </View>
  );
}

export function Input({ style, ...props }) {
  const t = useTheme();
  const [focus, setFocus] = React.useState(false);
  return (
    <TextInput
      placeholderTextColor={t.textFaint}
      {...props}
      onFocus={(e) => {
        setFocus(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocus(false);
        props.onBlur?.(e);
      }}
      style={[
        {
          backgroundColor: t.cardAlt,
          borderRadius: radius.md,
          paddingHorizontal: 14,
          paddingVertical: Platform.OS === 'ios' ? 14 : 11,
          fontSize: 16,
          color: t.text,
          borderWidth: 1.5,
          borderColor: focus ? t.primary : 'transparent',
          ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : null),
        },
        style,
      ]}
    />
  );
}

export function Empty({ icon, title, subtitle, action }) {
  const t = useTheme();
  return (
    <FadeIn style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32, gap: 10 }}>
      <View
        style={{
          width: 84,
          height: 84,
          borderRadius: 42,
          backgroundColor: t.chip,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 6,
        }}
      >
        <Ionicons name={icon} size={38} color={t.textFaint} />
      </View>
      <Text style={[font.h3, { color: t.text, textAlign: 'center' }]}>{title}</Text>
      {subtitle ? (
        <Text style={[font.small, { color: t.textMuted, textAlign: 'center', lineHeight: 20 }]}>
          {subtitle}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: 10 }}>{action}</View> : null}
    </FadeIn>
  );
}

/** Animated bottom sheet modal (centered card on wide screens). */
export function Sheet({ visible, onClose, title, children, footer, wide }) {
  const t = useTheme();
  const a = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = React.useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.spring(a, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 3 }).start();
    } else {
      Animated.timing(a, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => finished && setMounted(false));
    }
  }, [visible, a]);

  if (!mounted) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: t.overlay, opacity: a }]}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>
        <Animated.View
          style={{
            backgroundColor: t.sheet,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            maxHeight: '90%',
            width: '100%',
            maxWidth: wide ? 560 : 520,
            alignSelf: 'center',
            transform: [
              { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [500, 0] }) },
            ],
            ...shadow(24),
          }}
        >
          <View style={{ alignItems: 'center', paddingTop: 10 }}>
            <View
              style={{ width: 42, height: 5, borderRadius: 3, backgroundColor: t.border }}
            />
          </View>
          {title ? (
            <View
              style={{
                paddingHorizontal: 20,
                paddingTop: 14,
                paddingBottom: 8,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text style={[font.h2, { color: t.text }]}>{title}</Text>
              <Squish onPress={onClose} style={{ padding: 6 }}>
                <Ionicons name="close" size={24} color={t.textMuted} />
              </Squish>
            </View>
          ) : null}
          <ScrollView
            contentContainerStyle={{ padding: 20, paddingTop: title ? 8 : 20, gap: 16 }}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
          {footer ? (
            <SafeAreaView
              edges={['bottom']}
              style={{
                padding: 16,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: t.border,
              }}
            >
              {footer}
            </SafeAreaView>
          ) : (
            <SafeAreaView edges={['bottom']} />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

export function Confirm({ visible, title, message, confirmLabel = 'Delete', onConfirm, onCancel }) {
  const t = useTheme();
  return (
    <Sheet visible={visible} onClose={onCancel} title={title}>
      <Text style={[font.body, { color: t.textMuted, lineHeight: 22 }]}>{message}</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
        <Button title="Cancel" variant="soft" onPress={onCancel} style={{ flex: 1 }} />
        <Button title={confirmLabel} variant="danger" onPress={onConfirm} style={{ flex: 1 }} />
      </View>
    </Sheet>
  );
}

/** Gradient hero header used at the top of the main tabs. */
export function Hero({ children, style }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={t.headerGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        {
          borderBottomLeftRadius: radius.xl,
          borderBottomRightRadius: radius.xl,
          paddingHorizontal: 20,
          paddingBottom: 22,
          // web/desktop has no notch inset, so guarantee breathing room
          paddingTop: Math.max(insets.top, 14),
        },
        style,
      ]}
    >
      {children}
    </LinearGradient>
  );
}

export function Row({ children, style }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12 }, style]}>{children}</View>
  );
}

export function Divider() {
  const t = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.border }} />;
}

export function IconBadge({ icon, color, size = 42 }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.md,
        backgroundColor: color + '22',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={icon} size={size * 0.5} color={color} />
    </View>
  );
}
