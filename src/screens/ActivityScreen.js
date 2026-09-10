import React, { useMemo, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { Chip, Empty, FadeIn, Hero, Row, useTheme } from '../ui';
import { font } from '../theme';
import { useStore } from '../store';
import { ExpenseRow, SettlementRow } from './GroupDetailScreen';
import ExpenseEditor from '../ExpenseEditor';

const FILTERS = [
  { id: 'all', label: 'Everything' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'payments', label: 'Payments' },
];

export default function ActivityScreen() {
  const { state } = useStore();
  const t = useTheme();
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null);

  const feed = useMemo(() => {
    const items = [];
    if (filter !== 'payments')
      state.expenses.forEach((e) => items.push({ kind: 'expense', at: e.date, data: e }));
    if (filter !== 'expenses')
      state.settlements.forEach((s) => items.push({ kind: 'settlement', at: s.date, data: s }));
    return items.sort((a, b) => new Date(b.at) - new Date(a.at));
  }, [state.expenses, state.settlements, filter]);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Hero>
        <View style={{ paddingTop: 8, gap: 4 }}>
          <Text style={[font.h1, { color: '#fff' }]}>Activity</Text>
          <Text style={[font.small, { color: 'rgba(255,255,255,0.85)' }]}>
            {state.expenses.length} {state.expenses.length === 1 ? 'expense' : 'expenses'} ·{' '}
            {state.settlements.length}{' '}
            {state.settlements.length === 1 ? 'payment' : 'payments'}
          </Text>
        </View>
      </Hero>

      <Row style={{ paddingHorizontal: 16, paddingTop: 14, gap: 8 }}>
        {FILTERS.map((f) => (
          <Chip key={f.id} label={f.label} active={filter === f.id} onPress={() => setFilter(f.id)} />
        ))}
      </Row>

      <FlatList
        data={feed}
        keyExtractor={(i) => i.kind + i.data.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 10 }}
        ListEmptyComponent={
          <Empty
            icon="pulse-outline"
            title="Nothing has happened yet"
            subtitle="Expenses and payments across all your groups will show up here."
          />
        }
        renderItem={({ item, index }) =>
          item.kind === 'expense' ? (
            <ExpenseRow
              expense={item.data}
              index={index}
              showGroup
              onPress={() => setEditing(item.data)}
            />
          ) : (
            <SettlementRow settlement={item.data} index={index} />
          )
        }
      />

      <ExpenseEditor
        visible={!!editing}
        onClose={() => setEditing(null)}
        groupId={editing?.groupId}
        expense={editing}
      />
    </View>
  );
}
