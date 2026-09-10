import React, { useMemo, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Avatar,
  AnimatedAmount,
  Button,
  Card,
  Confirm,
  Empty,
  FadeIn,
  Field,
  Hero,
  Input,
  Row,
  Sheet,
  Squish,
  notify,
  useTheme,
} from '../ui';
import { font, radius } from '../theme';
import { MY_ID, fmt, uid, useSelectors, useStore } from '../store';
import ExpenseEditor from '../ExpenseEditor';
import SettleSheet from '../SettleSheet';
import { Fab } from './GroupsScreen';

export default function FriendsScreen() {
  const { state, dispatch } = useStore();
  const sel = useSelectors();
  const t = useTheme();

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [addExpense, setAddExpense] = useState(false);
  const [settleWith, setSettleWith] = useState(null);
  const [removing, setRemoving] = useState(null);

  const friends = useMemo(
    () =>
      state.people
        .filter((p) => p.id !== MY_ID)
        .map((p) => ({ ...p, net: sel.friendNet[p.id] || 0 }))
        .sort((a, b) => Math.abs(b.net) - Math.abs(a.net)),
    [state.people, sel.friendNet]
  );

  const savePerson = () => {
    const n = newName.trim();
    if (!n) return;
    dispatch({ type: 'ADD_PERSON', person: { id: uid(), name: n } });
    notify('success');
    setNewName('');
    setAdding(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Hero>
        <View style={{ paddingTop: 8, gap: 10 }}>
          <Text style={[font.h1, { color: '#fff' }]}>Friends</Text>
          <Row style={{ gap: 10 }}>
            <Stat label="YOU ARE OWED" value={sel.owedToMe} currency={state.currency} />
            <Stat label="YOU OWE" value={sel.iOwe} currency={state.currency} />
          </Row>
        </View>
      </Hero>

      <FlatList
        data={friends}
        keyExtractor={(f) => f.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 130, gap: 10 }}
        ListEmptyComponent={
          <Empty
            icon="person-add-outline"
            title="No friends added"
            subtitle="Add the people you split with. Everything stays on this device."
            action={<Button title="Add a friend" icon="add" onPress={() => setAdding(true)} />}
          />
        }
        renderItem={({ item, index }) => {
          const owed = item.net > 0.005;
          const owes = item.net < -0.005;
          return (
            <FadeIn delay={Math.min(index, 8) * 45}>
              <Card style={{ padding: 14 }}>
                <Row>
                  <Avatar id={item.id} name={item.name} size={46} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text numberOfLines={1} style={[font.h3, { color: t.text }]}>
                      {item.name}
                    </Text>
                    <Text style={[font.small, { color: t.textMuted }]}>
                      {owed ? 'owes you' : owes ? 'you owe them' : 'all settled up'}
                    </Text>
                  </View>
                  <Text
                    style={[
                      font.h3,
                      { color: owed ? t.positive : owes ? t.negative : t.textFaint },
                    ]}
                  >
                    {item.net === 0 ? '—' : fmt(Math.abs(item.net), state.currency)}
                  </Text>
                </Row>
                <Row style={{ marginTop: 12, gap: 8 }}>
                  <Button
                    title="Settle"
                    variant="soft"
                    icon="swap-horizontal-outline"
                    style={{ flex: 1, paddingVertical: 10 }}
                    onPress={() =>
                      setSettleWith(
                        item.net < 0
                          ? { from: MY_ID, to: item.id, amount: Math.abs(item.net) }
                          : { from: item.id, to: MY_ID, amount: Math.abs(item.net) }
                      )
                    }
                  />
                  <Squish
                    onPress={() => setRemoving(item)}
                    style={{
                      padding: 11,
                      borderRadius: radius.pill,
                      backgroundColor: t.chip,
                    }}
                  >
                    <Ionicons name="trash-outline" size={18} color={t.textMuted} />
                  </Squish>
                </Row>
              </Card>
            </FadeIn>
          );
        }}
      />

      <Fab onPress={() => setAddExpense(true)} icon="add" label="Expense" />

      <View style={{ position: 'absolute', right: 20, bottom: 96 }}>
        <Squish
          onPress={() => setAdding(true)}
          style={{
            backgroundColor: t.card,
            width: 48,
            height: 48,
            borderRadius: 24,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: t.border,
          }}
        >
          <Ionicons name="person-add-outline" size={21} color={t.text} />
        </Squish>
      </View>

      <Sheet
        visible={adding}
        onClose={() => setAdding(false)}
        title="Add a friend"
        footer={<Button title="Add friend" onPress={savePerson} full />}
      >
        <Field label="Name" hint="Stored only on this device — no account needed.">
          <Input
            value={newName}
            onChangeText={setNewName}
            placeholder="e.g. Priya"
            autoFocus
            onSubmitEditing={savePerson}
            returnKeyType="done"
          />
        </Field>
      </Sheet>

      <ExpenseEditor visible={addExpense} onClose={() => setAddExpense(false)} groupId={null} />
      <SettleSheet
        visible={!!settleWith}
        onClose={() => setSettleWith(null)}
        groupId={null}
        preset={settleWith}
      />
      <Confirm
        visible={!!removing}
        title={`Remove ${removing?.name}?`}
        message="They'll be removed from your groups. Existing expenses keep their history."
        confirmLabel="Remove"
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          dispatch({ type: 'DELETE_PERSON', id: removing.id });
          notify('warning');
          setRemoving(null);
        }}
      />
    </View>
  );
}

function Stat({ label, value, currency }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderRadius: radius.md,
        padding: 12,
      }}
    >
      <Text style={[font.tiny, { color: 'rgba(255,255,255,0.8)' }]}>{label}</Text>
      <AnimatedAmount
        value={value}
        format={(v) => fmt(v, currency)}
        style={{ color: '#fff', fontSize: 21, fontWeight: '800', marginTop: 3 }}
      />
    </View>
  );
}
