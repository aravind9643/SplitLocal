import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StoreProvider, useStore } from './store';
import { ThemeProvider, useTheme, Squish, tap } from './ui';
import { font, shadow } from './theme';
import GroupsScreen from './screens/GroupsScreen';
import GroupDetailScreen from './screens/GroupDetailScreen';
import FriendsScreen from './screens/FriendsScreen';
import ActivityScreen from './screens/ActivityScreen';
import SettingsScreen from './screens/SettingsScreen';

const TABS = [
  { id: 'groups', label: 'Groups', icon: 'people', iconOff: 'people-outline' },
  { id: 'friends', label: 'Friends', icon: 'person', iconOff: 'person-outline' },
  { id: 'activity', label: 'Activity', icon: 'pulse', iconOff: 'pulse-outline' },
  { id: 'settings', label: 'Settings', icon: 'settings', iconOff: 'settings-outline' },
];

/** Slides the detail screen in from the right over the tabs. */
function Stack({ children, visible }) {
  const a = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(a, {
        toValue: 1,
        duration: 280,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(a, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => finished && setMounted(false));
    }
  }, [visible, a]);

  if (!mounted) return null;
  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        StyleSheet.absoluteFill,
        {
          zIndex: 2,
          opacity: a,
          transform: [{ translateX: a.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

function TabBar({ active, onChange }) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: t.bgElevated,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: t.border,
        },
        shadow(16),
      ]}
    >
      <SafeAreaView edges={['bottom']}>
        <View style={{ flexDirection: 'row', paddingTop: 8, paddingBottom: 6 }}>
          {TABS.map((x) => {
            const on = active === x.id;
            return (
              <Squish
                key={x.id}
                haptic="light"
                scaleTo={0.9}
                onPress={() => onChange(x.id)}
                wrapperStyle={{ flex: 1 }}
                style={{ alignItems: 'center', gap: 3, paddingVertical: 4 }}
              >
                <Ionicons
                  name={on ? x.icon : x.iconOff}
                  size={23}
                  color={on ? t.primary : t.textFaint}
                />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: on ? '800' : '600',
                    color: on ? t.primary : t.textFaint,
                  }}
                >
                  {x.label}
                </Text>
              </Squish>
            );
          })}
        </View>
      </SafeAreaView>
    </View>
  );
}

/** Centers the app in a phone-width column on large screens. */
function Frame({ children }) {
  const { width } = useWindowDimensions();
  const t = useTheme();
  if (Platform.OS !== 'web' || width < 900) return children;
  return (
    <View style={{ flex: 1, alignItems: 'center', backgroundColor: t.bgElevated }}>
      <View
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 520,
          backgroundColor: t.bg,
          borderLeftWidth: StyleSheet.hairlineWidth,
          borderRightWidth: StyleSheet.hairlineWidth,
          borderColor: t.border,
          overflow: 'hidden',
        }}
      >
        {children}
      </View>
    </View>
  );
}

function Shell() {
  const { state } = useStore();
  const t = useTheme();
  const [tab, setTab] = useState('groups');
  const [openGroup, setOpenGroup] = useState(null);
  // keeps the detail screen rendered while it animates out
  const lastGroup = useRef(null);
  if (openGroup) lastGroup.current = openGroup;

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (openGroup) {
        setOpenGroup(null);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [openGroup]);

  if (!state.ready)
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg }}>
        <ActivityIndicator color={t.primary} size="large" />
      </View>
    );

  return (
    <Frame>
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <StatusBar style="light" />
        <View style={{ flex: 1 }}>
        <View
          pointerEvents={openGroup ? 'none' : 'auto'}
          style={{ flex: 1, display: openGroup ? 'none' : 'flex' }}
        >
          {tab === 'groups' ? (
            <GroupsScreen onOpenGroup={setOpenGroup} />
          ) : tab === 'friends' ? (
            <FriendsScreen />
          ) : tab === 'activity' ? (
            <ActivityScreen />
          ) : (
            <SettingsScreen />
          )}
        </View>
        <Stack visible={!!openGroup}>
          <GroupDetailScreen
            groupId={openGroup || lastGroup.current}
            onBack={() => setOpenGroup(null)}
          />
          </Stack>
        </View>
        {!openGroup ? <TabBar active={tab} onChange={setTab} /> : null}
      </View>
    </Frame>
  );
}

function Themed() {
  const { state } = useStore();
  return (
    <ThemeProvider mode={state.themeMode} accent={state.accent}>
      <Shell />
    </ThemeProvider>
  );
}

export default function Root() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StoreProvider>
          <Themed />
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
