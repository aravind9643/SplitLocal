import React, { useState } from 'react';
import { Platform, ScrollView, Share, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Avatar,
  Button,
  Card,
  Chip,
  Confirm,
  Divider,
  FadeIn,
  Field,
  Hero,
  IconBadge,
  Input,
  Row,
  Sheet,
  Squish,
  notify,
  useTheme,
} from '../ui';
import { LinearGradient } from 'expo-linear-gradient';
import { accentList, accents, font, radius } from '../theme';
import { CURRENCIES, MY_ID, fmt, plural, useSelectors, useStore } from '../store';

const MODES = [
  { id: 'light', label: 'Light', icon: 'sunny-outline' },
  { id: 'dark', label: 'Dark', icon: 'moon-outline' },
  { id: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

export default function SettingsScreen() {
  const { state, dispatch } = useStore();
  const sel = useSelectors();
  const t = useTheme();
  const me = sel.personById(MY_ID);

  const [editName, setEditName] = useState(false);
  const [name, setName] = useState(me.name);
  const [resetting, setResetting] = useState(false);
  const [exported, setExported] = useState(null);

  const exportData = async () => {
    const { ready, ...data } = state;
    const json = JSON.stringify(data, null, 2);
    if (Platform.OS === 'web') {
      setExported(json);
    } else {
      try {
        await Share.share({ message: json, title: 'SplitLocal backup' });
      } catch {
        setExported(json);
      }
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Hero>
        <View style={{ paddingTop: 8 }}>
          <Text style={[font.h1, { color: '#fff' }]}>Settings</Text>
        </View>
      </Hero>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 12 }}>
        <FadeIn>
          <Card>
            <Row>
              <Avatar id={MY_ID} name={me.name} size={54} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[font.h3, { color: t.text }]}>{me.name}</Text>
                <Text style={[font.small, { color: t.textMuted }]}>
                  {sel.myTotal > 0.005
                    ? `Net: you are owed ${fmt(sel.myTotal, state.currency)}`
                    : sel.myTotal < -0.005
                    ? `Net: you owe ${fmt(Math.abs(sel.myTotal), state.currency)}`
                    : 'Net: all settled up'}
                </Text>
              </View>
              <Squish
                onPress={() => {
                  setName(me.name);
                  setEditName(true);
                }}
                style={{ padding: 8 }}
              >
                <Ionicons name="create-outline" size={21} color={t.textMuted} />
              </Squish>
            </Row>
          </Card>
        </FadeIn>

        <FadeIn delay={70}>
          <Card>
            <Text style={[font.h3, { color: t.text, marginBottom: 12 }]}>Appearance</Text>
            <Row style={{ gap: 8, flexWrap: 'wrap' }}>
              {MODES.map((m) => (
                <Chip
                  key={m.id}
                  label={m.label}
                  icon={m.icon}
                  active={state.themeMode === m.id}
                  onPress={() => dispatch({ type: 'SET', payload: { themeMode: m.id } })}
                />
              ))}
            </Row>

            <Text style={[font.h3, { color: t.text, marginTop: 22, marginBottom: 4 }]}>
              Color theme
            </Text>
            <Text style={[font.small, { color: t.textMuted, marginBottom: 14 }]}>
              {accents[state.accent]?.label || 'Teal'}
            </Text>
            <Row style={{ gap: 12, flexWrap: 'wrap' }}>
              {accentList.map((a) => {
                const on = state.accent === a.id;
                return (
                  <Squish
                    key={a.id}
                    onPress={() => dispatch({ type: 'SET', payload: { accent: a.id } })}
                    style={{ alignItems: 'center', gap: 6, width: 60 }}
                  >
                    <View
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 23,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 2.5,
                        borderColor: on ? a.primary : 'transparent',
                        backgroundColor: on ? a.primary + '1F' : 'transparent',
                      }}
                    >
                      <LinearGradient
                        colors={a.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {on ? <Ionicons name="checkmark" size={19} color="#fff" /> : null}
                      </LinearGradient>
                    </View>
                    <Text
                      numberOfLines={1}
                      style={[
                        font.small,
                        {
                          color: on ? t.text : t.textMuted,
                          fontWeight: on ? '700' : '500',
                          fontSize: 12,
                        },
                      ]}
                    >
                      {a.label}
                    </Text>
                  </Squish>
                );
              })}
            </Row>
          </Card>
        </FadeIn>

        <FadeIn delay={140}>
          <Card>
            <Text style={[font.h3, { color: t.text, marginBottom: 12 }]}>Currency</Text>
            <Row style={{ gap: 8, flexWrap: 'wrap' }}>
              {CURRENCIES.map((c) => (
                <Chip
                  key={c.code}
                  label={`${c.symbol} ${c.code}`}
                  active={state.currency === c.code}
                  onPress={() => dispatch({ type: 'SET', payload: { currency: c.code } })}
                />
              ))}
            </Row>
          </Card>
        </FadeIn>

        <FadeIn delay={210}>
          <Card padded={false}>
            <SettingRow
              icon="download-outline"
              color="#38BDF8"
              title="Export data"
              subtitle="Copy a JSON backup of everything"
              onPress={exportData}
            />
            <Divider />
            <SettingRow
              icon="stats-chart-outline"
              color="#7C5CFF"
              title="Stored locally"
              subtitle={`${plural(state.groups.length, 'group')} · ${plural(
                state.people.length,
                'person',
                'people'
              )} · ${plural(state.expenses.length, 'expense')}`}
            />
            <Divider />
            <SettingRow
              icon="trash-outline"
              color="#FF6B6B"
              title="Reset everything"
              subtitle="Wipe all local data"
              onPress={() => setResetting(true)}
            />
          </Card>
        </FadeIn>

        <FadeIn delay={280}>
          <View style={{ alignItems: 'center', paddingVertical: 20, gap: 6 }}>
            <Ionicons name="lock-closed-outline" size={20} color={t.textFaint} />
            <Text style={[font.small, { color: t.textFaint, textAlign: 'center', lineHeight: 20 }]}>
              No account, no server, no sync.{'\n'}Everything lives on this device only.
            </Text>
          </View>
        </FadeIn>
      </ScrollView>

      <Sheet
        visible={editName}
        onClose={() => setEditName(false)}
        title="Your name"
        footer={
          <Button
            title="Save"
            full
            onPress={() => {
              if (name.trim())
                dispatch({ type: 'UPDATE_PERSON', person: { id: MY_ID, name: name.trim() } });
              setEditName(false);
              notify('success');
            }}
          />
        }
      >
        <Field label="Display name">
          <Input value={name} onChangeText={setName} placeholder="You" autoFocus />
        </Field>
      </Sheet>

      <Sheet visible={!!exported} onClose={() => setExported(null)} title="Backup JSON">
        <Field label="Copy this somewhere safe">
          <Input
            value={exported || ''}
            multiline
            editable={false}
            style={{ minHeight: 260, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 11 }}
          />
        </Field>
      </Sheet>

      <Confirm
        visible={resetting}
        title="Reset everything?"
        message="All groups, friends, expenses and payments will be permanently deleted from this device."
        confirmLabel="Reset"
        onCancel={() => setResetting(false)}
        onConfirm={() => {
          dispatch({ type: 'RESET' });
          notify('warning');
          setResetting(false);
        }}
      />
    </View>
  );
}

function SettingRow({ icon, color, title, subtitle, onPress }) {
  const t = useTheme();
  const body = (
    <Row style={{ padding: 16 }}>
      <IconBadge icon={icon} color={color} size={40} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[font.body, { color: t.text, fontWeight: '700' }]}>{title}</Text>
        <Text style={[font.small, { color: t.textMuted }]}>{subtitle}</Text>
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={18} color={t.textFaint} /> : null}
    </Row>
  );
  return onPress ? <Squish onPress={onPress}>{body}</Squish> : body;
}
