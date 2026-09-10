import React, { useMemo, useState } from 'react';
import { FlatList, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Avatar,
  AvatarStack,
  Button,
  Card,
  Chip,
  Confirm,
  Divider,
  Empty,
  FadeIn,
  Hero,
  IconBadge,
  ProgressBar,
  Row,
  Squish,
  notify,
  useTheme,
} from '../ui';
import { font, radius } from '../theme';
import {
  MY_ID,
  categoryById,
  computeShares,
  fmt,
  simplifyDebts,
  useSelectors,
  useStore,
} from '../store';
import ExpenseEditor from '../ExpenseEditor';
import { GroupEditor, Fab, groupType } from './GroupsScreen';
import SettleSheet from '../SettleSheet';

const TABS = [
  { id: 'expenses', label: 'Expenses' },
  { id: 'balances', label: 'Balances' },
  { id: 'totals', label: 'Totals' },
];

export default function GroupDetailScreen({ groupId, onBack }) {
  const { state, dispatch } = useStore();
  const sel = useSelectors();
  const t = useTheme();
  const group = state.groups.find((g) => g.id === groupId);

  const [tab, setTab] = useState('expenses');
  const [adding, setAdding] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editingGroup, setEditingGroup] = useState(false);
  const [settling, setSettling] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!group) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <Empty icon="alert-circle-outline" title="Group not found" action={<Button title="Go back" onPress={onBack} />} />
      </View>
    );
  }

  const expenses = sel.groupExpenses(groupId);
  const settlements = sel.groupSettlements(groupId);
  const balances = sel.groupBalances(groupId);
  const members = group.memberIds.map(sel.personById);
  const mine = balances[MY_ID] || 0;
  const transactions = simplifyDebts(balances);
  const total = expenses.reduce((a, e) => a + e.amount, 0);
  const gt = groupType(group.type);

  const feed = useMemo(() => {
    const items = [
      ...expenses.map((e) => ({ kind: 'expense', at: e.date, data: e })),
      ...settlements.map((s) => ({ kind: 'settlement', at: s.date, data: s })),
    ];
    return items.sort((a, b) => new Date(b.at) - new Date(a.at));
  }, [expenses, settlements]);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Hero style={{ paddingBottom: 18 }}>
        <Row style={{ paddingTop: 6, justifyContent: 'space-between' }}>
          <Squish onPress={onBack} style={{ padding: 6, marginLeft: -6 }}>
            <Ionicons name="arrow-back" size={26} color="#fff" />
          </Squish>
          <Row style={{ gap: 4 }}>
            <Squish onPress={() => setEditingGroup(true)} style={{ padding: 8 }}>
              <Ionicons name="create-outline" size={22} color="#fff" />
            </Squish>
            <Squish onPress={() => setConfirmDelete(true)} style={{ padding: 8 }}>
              <Ionicons name="trash-outline" size={22} color="#fff" />
            </Squish>
          </Row>
        </Row>

        <Row style={{ marginTop: 6 }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: radius.md,
              backgroundColor: 'rgba(255,255,255,0.22)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={gt.icon} size={27} color="#fff" />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text numberOfLines={1} style={[font.h1, { color: '#fff', fontSize: 26 }]}>
              {group.name}
            </Text>
            <Text style={[font.small, { color: 'rgba(255,255,255,0.85)' }]}>
              {fmt(total, state.currency)} spent · {members.length}{' '}
              {members.length === 1 ? 'member' : 'members'}
            </Text>
          </View>
        </Row>

        <Row style={{ marginTop: 16, justifyContent: 'space-between' }}>
          <View>
            <Text style={[font.tiny, { color: 'rgba(255,255,255,0.75)' }]}>
              {mine > 0.005 ? 'YOU ARE OWED' : mine < -0.005 ? 'YOU OWE' : 'ALL SETTLED UP'}
            </Text>
            <Text style={[font.h1, { color: '#fff', marginTop: 2 }]}>
              {mine === 0 ? '🎉' : fmt(Math.abs(mine), state.currency)}
            </Text>
          </View>
          <AvatarStack people={members} size={32} max={5} />
        </Row>
      </Hero>

      <Row style={{ paddingHorizontal: 16, paddingTop: 14, gap: 8 }}>
        {TABS.map((x) => (
          <Chip key={x.id} label={x.label} active={tab === x.id} onPress={() => setTab(x.id)} />
        ))}
      </Row>

      {tab === 'expenses' ? (
        <FlatList
          data={feed}
          keyExtractor={(i) => i.kind + i.data.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 130, gap: 10 }}
          ListEmptyComponent={
            <Empty
              icon="receipt-outline"
              title="Nothing here yet"
              subtitle="Add your first expense and we'll keep the maths straight."
              action={<Button title="Add expense" icon="add" onPress={() => setAdding(true)} />}
            />
          }
          renderItem={({ item, index }) =>
            item.kind === 'expense' ? (
              <ExpenseRow
                expense={item.data}
                index={index}
                onPress={() => setEditingExpense(item.data)}
              />
            ) : (
              <SettlementRow settlement={item.data} index={index} />
            )
          }
        />
      ) : tab === 'balances' ? (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 130, gap: 12 }}>
          <FadeIn>
            <Card>
              <Row style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={[font.h3, { color: t.text }]}>Suggested payments</Text>
                <Text style={[font.small, { color: t.textMuted }]}>
                  {transactions.length} {transactions.length === 1 ? 'transfer' : 'transfers'}
                </Text>
              </Row>
              {transactions.length === 0 ? (
                <Row style={{ gap: 8, paddingVertical: 12 }}>
                  <Ionicons name="checkmark-circle" size={22} color={t.positive} />
                  <Text style={[font.body, { color: t.textMuted }]}>
                    Everyone's square. Nothing to pay.
                  </Text>
                </Row>
              ) : (
                <View style={{ gap: 10, marginTop: 10 }}>
                  {transactions.map((tx, i) => {
                    const from = sel.personById(tx.from);
                    const to = sel.personById(tx.to);
                    return (
                      <FadeIn key={i} delay={i * 60}>
                        <View
                          style={{
                            backgroundColor: t.cardAlt,
                            borderRadius: radius.md,
                            padding: 12,
                          }}
                        >
                          <Row>
                            <Avatar id={from.id} name={from.name} size={32} />
                            <Ionicons name="arrow-forward" size={16} color={t.textFaint} />
                            <Avatar id={to.id} name={to.name} size={32} />
                            <View style={{ flex: 1 }}>
                              <Text style={[font.small, { color: t.textMuted }]} numberOfLines={2}>
                                <Text style={{ color: t.text, fontWeight: '700' }}>
                                  {from.id === MY_ID ? 'You' : from.name}
                                </Text>
                                {' pays '}
                                <Text style={{ color: t.text, fontWeight: '700' }}>
                                  {to.id === MY_ID ? 'you' : to.name}
                                </Text>
                              </Text>
                            </View>
                            <Text style={[font.h3, { color: t.primaryDark }]}>
                              {fmt(tx.amount, state.currency)}
                            </Text>
                          </Row>
                        </View>
                      </FadeIn>
                    );
                  })}
                  <Button
                    title="Settle up"
                    icon="swap-horizontal-outline"
                    full
                    onPress={() => setSettling(true)}
                  />
                </View>
              )}
            </Card>
          </FadeIn>

          <FadeIn delay={100}>
            <Card>
              <Text style={[font.h3, { color: t.text, marginBottom: 12 }]}>Net per person</Text>
              <View style={{ gap: 14 }}>
                {members.map((m) => {
                  const v = balances[m.id] || 0;
                  const max = Math.max(
                    1,
                    ...members.map((x) => Math.abs(balances[x.id] || 0))
                  );
                  return (
                    <View key={m.id} style={{ gap: 6 }}>
                      <Row>
                        <Avatar id={m.id} name={m.name} size={30} />
                        <Text style={[font.body, { color: t.text, flex: 1, fontWeight: '600' }]}>
                          {m.id === MY_ID ? 'You' : m.name}
                        </Text>
                        <Text
                          style={[
                            font.body,
                            {
                              fontWeight: '800',
                              color: v > 0.005 ? t.positive : v < -0.005 ? t.negative : t.textFaint,
                            },
                          ]}
                        >
                          {v === 0 ? 'settled' : `${v > 0 ? '+' : '-'}${fmt(Math.abs(v), state.currency)}`}
                        </Text>
                      </Row>
                      <ProgressBar
                        pct={Math.abs(v) / max}
                        color={v >= 0 ? t.positive : t.negative}
                        track={t.cardAlt}
                        height={6}
                      />
                    </View>
                  );
                })}
              </View>
            </Card>
          </FadeIn>
        </ScrollView>
      ) : (
        <TotalsTab groupId={groupId} members={members} expenses={expenses} />
      )}

      <Fab onPress={() => setAdding(true)} icon="add" label="Expense" />

      <ExpenseEditor visible={adding} onClose={() => setAdding(false)} groupId={groupId} />
      <ExpenseEditor
        visible={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        groupId={groupId}
        expense={editingExpense}
      />
      <GroupEditor visible={editingGroup} onClose={() => setEditingGroup(false)} group={group} />
      <SettleSheet
        visible={settling}
        onClose={() => setSettling(false)}
        groupId={groupId}
        transactions={transactions}
      />
      <Confirm
        visible={confirmDelete}
        title={`Delete "${group.name}"?`}
        message="This removes the group along with all of its expenses and settlements. This can't be undone."
        confirmLabel="Delete group"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          dispatch({ type: 'DELETE_GROUP', id: groupId });
          notify('warning');
          onBack();
        }}
      />
    </View>
  );
}

export function ExpenseRow({ expense, onPress, index = 0, showGroup }) {
  const { state } = useStore();
  const sel = useSelectors();
  const t = useTheme();
  const cat = categoryById(expense.category);
  const shares = computeShares(expense);
  const payer = sel.personById(expense.paidBy);
  const myShare = shares[MY_ID] || 0;
  const iPaid = expense.paidBy === MY_ID;
  const net = (iPaid ? expense.amount : 0) - myShare;
  const d = new Date(expense.date);
  const group = showGroup ? state.groups.find((g) => g.id === expense.groupId) : null;

  return (
    <FadeIn delay={Math.min(index, 8) * 40}>
      <Card onPress={onPress} style={{ padding: 14 }}>
        <Row>
          <View style={{ alignItems: 'center', width: 34 }}>
            <Text style={[font.tiny, { color: t.textFaint }]}>
              {d.toLocaleString(undefined, { month: 'short' }).toUpperCase()}
            </Text>
            <Text style={[font.h3, { color: t.textMuted }]}>{d.getDate()}</Text>
          </View>
          <IconBadge icon={cat.icon} color={cat.color} size={44} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text numberOfLines={1} style={[font.h3, { color: t.text }]}>
              {expense.title}
            </Text>
            <Text numberOfLines={1} style={[font.small, { color: t.textMuted }]}>
              {iPaid ? 'You' : payer.name} paid {fmt(expense.amount, state.currency)}
              {group ? ` · ${group.name}` : ''}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <Text
              style={[
                font.body,
                {
                  fontWeight: '800',
                  color: net > 0.005 ? t.positive : net < -0.005 ? t.negative : t.textFaint,
                },
              ]}
            >
              {Math.abs(net) < 0.005 ? '—' : fmt(Math.abs(net), state.currency)}
            </Text>
            <Text style={[font.tiny, { color: t.textFaint }]}>
              {net > 0.005 ? 'YOU LENT' : net < -0.005 ? 'YOU OWE' : 'NOT YOU'}
            </Text>
          </View>
        </Row>
      </Card>
    </FadeIn>
  );
}

export function SettlementRow({ settlement, index = 0 }) {
  const { state, dispatch } = useStore();
  const sel = useSelectors();
  const t = useTheme();
  const from = sel.personById(settlement.from);
  const to = sel.personById(settlement.to);
  const d = new Date(settlement.date);

  return (
    <FadeIn delay={Math.min(index, 8) * 40}>
      <Card
        style={{ padding: 14, backgroundColor: t.primary + '14', borderColor: t.primary + '33' }}
        onPress={() => dispatch({ type: 'DELETE_SETTLEMENT', id: settlement.id })}
      >
        <Row>
          <View style={{ alignItems: 'center', width: 34 }}>
            <Text style={[font.tiny, { color: t.textFaint }]}>
              {d.toLocaleString(undefined, { month: 'short' }).toUpperCase()}
            </Text>
            <Text style={[font.h3, { color: t.textMuted }]}>{d.getDate()}</Text>
          </View>
          <IconBadge icon="checkmark-done-outline" color={t.primaryDark} size={44} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text numberOfLines={1} style={[font.h3, { color: t.text }]}>
              Payment
            </Text>
            <Text numberOfLines={1} style={[font.small, { color: t.textMuted }]}>
              {from.id === MY_ID ? 'You' : from.name} paid {to.id === MY_ID ? 'you' : to.name}
              {settlement.note ? ` · ${settlement.note}` : ''}
            </Text>
          </View>
          <Text style={[font.body, { fontWeight: '800', color: t.primaryDark }]}>
            {fmt(settlement.amount, state.currency)}
          </Text>
        </Row>
      </Card>
    </FadeIn>
  );
}

function TotalsTab({ members, expenses }) {
  const { state } = useStore();
  const t = useTheme();
  const sel = useSelectors();

  const byCategory = useMemo(() => {
    const m = {};
    expenses.forEach((e) => (m[e.category] = (m[e.category] || 0) + e.amount));
    return Object.entries(m)
      .map(([id, v]) => ({ ...categoryById(id), total: v }))
      .sort((a, b) => b.total - a.total);
  }, [expenses]);

  const byPerson = useMemo(() => {
    const paid = {};
    const owed = {};
    expenses.forEach((e) => {
      paid[e.paidBy] = (paid[e.paidBy] || 0) + e.amount;
      const s = computeShares(e);
      Object.entries(s).forEach(([id, v]) => (owed[id] = (owed[id] || 0) + v));
    });
    return members.map((m) => ({ ...m, paid: paid[m.id] || 0, share: owed[m.id] || 0 }));
  }, [expenses, members]);

  const total = expenses.reduce((a, e) => a + e.amount, 0);
  const maxCat = Math.max(1, ...byCategory.map((c) => c.total));

  if (!expenses.length)
    return (
      <Empty icon="pie-chart-outline" title="No spending yet" subtitle="Totals appear once you add expenses." />
    );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 130, gap: 12 }}>
      <FadeIn>
        <Card>
          <Text style={[font.tiny, { color: t.textFaint }]}>TOTAL GROUP SPENDING</Text>
          <Text style={[font.h1, { color: t.text, marginTop: 4 }]}>
            {fmt(total, state.currency)}
          </Text>
          <Text style={[font.small, { color: t.textMuted, marginTop: 2 }]}>
            across {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'} · avg{' '}
            {fmt(total / expenses.length, state.currency)}
          </Text>
        </Card>
      </FadeIn>

      <FadeIn delay={80}>
        <Card>
          <Text style={[font.h3, { color: t.text, marginBottom: 14 }]}>By category</Text>
          <View style={{ gap: 14 }}>
            {byCategory.map((c) => (
              <View key={c.id} style={{ gap: 6 }}>
                <Row>
                  <IconBadge icon={c.icon} color={c.color} size={30} />
                  <Text style={[font.body, { color: t.text, flex: 1, fontWeight: '600' }]}>
                    {c.label}
                  </Text>
                  <Text style={[font.body, { color: t.textMuted, fontWeight: '700' }]}>
                    {fmt(c.total, state.currency)}
                  </Text>
                </Row>
                <ProgressBar pct={c.total / maxCat} color={c.color} track={t.cardAlt} height={6} />
              </View>
            ))}
          </View>
        </Card>
      </FadeIn>

      <FadeIn delay={160}>
        <Card>
          <Text style={[font.h3, { color: t.text, marginBottom: 12 }]}>Paid vs. share</Text>
          <View style={{ gap: 12 }}>
            {byPerson.map((p) => (
              <View key={p.id}>
                <Row>
                  <Avatar id={p.id} name={p.name} size={32} />
                  <View style={{ flex: 1 }}>
                    <Text style={[font.body, { color: t.text, fontWeight: '600' }]}>
                      {p.id === MY_ID ? 'You' : p.name}
                    </Text>
                    <Text style={[font.small, { color: t.textMuted }]}>
                      paid {fmt(p.paid, state.currency)} · share {fmt(p.share, state.currency)}
                    </Text>
                  </View>
                </Row>
              </View>
            ))}
          </View>
        </Card>
      </FadeIn>
    </ScrollView>
  );
}
