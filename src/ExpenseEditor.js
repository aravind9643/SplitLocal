import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Avatar,
  Button,
  Chip,
  Divider,
  Field,
  IconBadge,
  Input,
  Row,
  Sheet,
  Squish,
  notify,
  useTheme,
} from './ui';
import { font, radius } from './theme';
import {
  CATEGORIES,
  MY_ID,
  categoryById,
  computeShares,
  currencySymbol,
  fmt,
  round2,
  uid,
  useStore,
} from './store';

const SPLIT_MODES = [
  { id: 'equal', label: 'Equally', icon: 'reorder-four-outline' },
  { id: 'exact', label: 'Exact', icon: 'calculator-outline' },
  { id: 'percent', label: 'Percent', icon: 'pie-chart-outline' },
  { id: 'shares', label: 'Shares', icon: 'stats-chart-outline' },
];

export default function ExpenseEditor({ visible, onClose, groupId, expense, defaultParticipants }) {
  const { state, dispatch } = useStore();
  const t = useTheme();
  const editing = !!expense;

  const group = state.groups.find((g) => g.id === groupId);
  const pool = useMemo(() => {
    const ids = group ? group.memberIds : state.people.map((p) => p.id);
    return state.people.filter((p) => ids.includes(p.id));
  }, [group, state.people]);

  const [title, setTitle] = useState('');
  const [amountText, setAmountText] = useState('');
  const [category, setCategory] = useState('general');
  const [paidBy, setPaidBy] = useState(MY_ID);
  const [participants, setParticipants] = useState([]);
  const [splitMode, setSplitMode] = useState('equal');
  const [splitValues, setSplitValues] = useState({});
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    if (expense) {
      setTitle(expense.title);
      setAmountText(String(expense.amount));
      setCategory(expense.category);
      setPaidBy(expense.paidBy);
      setParticipants(expense.participants);
      setSplitMode(expense.splitMode);
      setSplitValues(expense.splitValues || {});
      setNotes(expense.notes || '');
    } else {
      const init = defaultParticipants || pool.map((p) => p.id);
      setTitle('');
      setAmountText('');
      setCategory('general');
      setPaidBy(MY_ID);
      setParticipants(init);
      setSplitMode('equal');
      setSplitValues({});
      setNotes('');
    }
    setError('');
  }, [visible, expense]);

  const amount = round2(parseFloat(amountText.replace(',', '.')) || 0);
  const sym = currencySymbol(state.currency);

  const draft = { amount, splitMode, participants, splitValues };
  const shares = computeShares(draft);
  const sharesTotal = round2(
    participants.reduce((a, id) => a + (shares[id] || 0), 0)
  );

  const valuesTotal = round2(
    participants.reduce((a, id) => a + (Number(splitValues[id]) || 0), 0)
  );

  const toggleParticipant = (id) => {
    setParticipants((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
    setError('');
  };

  const switchMode = (mode) => {
    setSplitMode(mode);
    setError('');
    if (mode === 'equal') {
      setSplitValues({});
    } else if (mode === 'shares') {
      const v = {};
      participants.forEach((id) => (v[id] = 1));
      setSplitValues(v);
    } else if (mode === 'percent') {
      const each = participants.length ? round2(100 / participants.length) : 0;
      const v = {};
      participants.forEach((id) => (v[id] = each));
      setSplitValues(v);
    } else if (mode === 'exact') {
      const eq = computeShares({ amount, splitMode: 'equal', participants, splitValues: {} });
      setSplitValues(eq);
    }
  };

  const validate = () => {
    if (!title.trim()) return 'Give the expense a description.';
    if (!(amount > 0)) return 'Enter an amount greater than zero.';
    if (!participants.length) return 'Pick at least one person to split with.';
    if (splitMode === 'exact' && Math.abs(valuesTotal - amount) > 0.011)
      return `Exact amounts add up to ${fmt(valuesTotal, state.currency)}, but the total is ${fmt(amount, state.currency)}.`;
    if (splitMode === 'percent' && Math.abs(valuesTotal - 100) > 0.11)
      return `Percentages add up to ${round2(valuesTotal)}%, not 100%.`;
    if (splitMode === 'shares' && valuesTotal <= 0) return 'Assign at least one share.';
    return '';
  };

  const save = () => {
    const err = validate();
    if (err) {
      setError(err);
      notify('error');
      return;
    }
    const payload = {
      id: expense?.id || uid(),
      groupId: groupId || null,
      title: title.trim(),
      amount,
      category,
      paidBy,
      payers: { [paidBy]: amount },
      participants,
      splitMode,
      splitValues,
      notes: notes.trim(),
      date: expense?.date || new Date().toISOString(),
    };
    dispatch({ type: editing ? 'UPDATE_EXPENSE' : 'ADD_EXPENSE', expense: payload });
    notify('success');
    onClose();
  };

  const cat = categoryById(category);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={editing ? 'Edit expense' : 'Add an expense'}
      footer={
        <View style={{ gap: 8 }}>
          {error ? (
            <Row style={{ gap: 6 }}>
              <Ionicons name="alert-circle" size={16} color={t.negative} />
              <Text style={[font.small, { color: t.negative, flex: 1 }]}>{error}</Text>
            </Row>
          ) : null}
          <Button
            title={editing ? 'Save changes' : 'Add expense'}
            icon="checkmark-circle-outline"
            onPress={save}
            full
          />
        </View>
      }
    >
      {/* amount */}
      <View style={{ alignItems: 'center', gap: 4, paddingVertical: 4 }}>
        <Row style={{ gap: 4, alignItems: 'flex-end' }}>
          <Text style={{ color: t.textMuted, fontSize: 26, fontWeight: '700', paddingBottom: 6 }}>
            {sym}
          </Text>
          <Input
            value={amountText}
            onChangeText={(v) => {
              setAmountText(v.replace(/[^0-9.,]/g, ''));
              setError('');
            }}
            placeholder="0"
            keyboardType="decimal-pad"
            style={{
              fontSize: 40,
              fontWeight: '800',
              textAlign: 'center',
              minWidth: 150,
              backgroundColor: 'transparent',
              paddingVertical: 4,
            }}
          />
        </Row>
      </View>

      <Field label="Description">
        <Row>
          <IconBadge icon={cat.icon} color={cat.color} />
          <Input
            value={title}
            onChangeText={(v) => {
              setTitle(v);
              setError('');
            }}
            placeholder="Dinner, rent, cab…"
            style={{ flex: 1 }}
          />
        </Row>
      </Field>

      <Field label="Category">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Row style={{ gap: 8, paddingRight: 8 }}>
            {CATEGORIES.map((c) => (
              <Chip
                key={c.id}
                label={c.label}
                icon={c.icon}
                color={c.color}
                active={category === c.id}
                onPress={() => setCategory(c.id)}
              />
            ))}
          </Row>
        </ScrollView>
      </Field>

      <Field label="Paid by">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Row style={{ gap: 8, paddingRight: 8 }}>
            {pool.map((p) => {
              const active = paidBy === p.id;
              return (
                <Squish
                  key={p.id}
                  onPress={() => setPaidBy(p.id)}
                  style={{
                    alignItems: 'center',
                    gap: 6,
                    padding: 8,
                    borderRadius: radius.md,
                    backgroundColor: active ? t.primary + '22' : 'transparent',
                    borderWidth: 1.5,
                    borderColor: active ? t.primary : 'transparent',
                    minWidth: 68,
                  }}
                >
                  <Avatar id={p.id} name={p.name} size={38} />
                  <Text
                    numberOfLines={1}
                    style={[font.small, { color: active ? t.text : t.textMuted, maxWidth: 60 }]}
                  >
                    {p.id === MY_ID ? 'You' : p.name}
                  </Text>
                </Squish>
              );
            })}
          </Row>
        </ScrollView>
      </Field>

      <Divider />

      <Field
        label="Split"
        hint={
          splitMode === 'exact'
            ? `${fmt(valuesTotal, state.currency)} of ${fmt(amount, state.currency)} assigned`
            : splitMode === 'percent'
            ? `${round2(valuesTotal)}% of 100% assigned`
            : splitMode === 'shares'
            ? `${round2(valuesTotal)} total shares`
            : `${fmt(sharesTotal, state.currency)} across ${participants.length} ${
                participants.length === 1 ? 'person' : 'people'
              }`
        }
      >
        <Row style={{ gap: 8, flexWrap: 'wrap' }}>
          {SPLIT_MODES.map((m) => (
            <Chip
              key={m.id}
              label={m.label}
              icon={m.icon}
              active={splitMode === m.id}
              onPress={() => switchMode(m.id)}
            />
          ))}
        </Row>
      </Field>

      <View
        style={{
          backgroundColor: t.cardAlt,
          borderRadius: radius.lg,
          overflow: 'hidden',
        }}
      >
        {pool.map((p, i) => {
          const on = participants.includes(p.id);
          const share = shares[p.id] || 0;
          return (
            <View key={p.id}>
              {i > 0 ? <Divider /> : null}
              <Row style={{ paddingHorizontal: 14, paddingVertical: 11 }}>
                {/* whole name area toggles participation, not just the checkbox */}
                <Squish
                  onPress={() => toggleParticipant(p.id)}
                  wrapperStyle={{ flex: 1 }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
                >
                  <Ionicons
                    name={on ? 'checkbox' : 'square-outline'}
                    size={23}
                    color={on ? t.primary : t.textFaint}
                  />
                  <Avatar id={p.id} name={p.name} size={34} />
                  <View style={{ flex: 1 }}>
                    <Text
                      numberOfLines={1}
                      style={[font.body, { color: on ? t.text : t.textFaint, fontWeight: '600' }]}
                    >
                      {p.id === MY_ID ? 'You' : p.name}
                    </Text>
                    {on && splitMode !== 'equal' ? (
                      <Text style={[font.small, { color: t.textMuted }]}>
                        {fmt(share, state.currency)}
                      </Text>
                    ) : null}
                  </View>
                </Squish>

                {!on ? null : splitMode === 'equal' ? (
                  <Text style={[font.h3, { color: t.text }]}>{fmt(share, state.currency)}</Text>
                ) : (
                  <Row style={{ gap: 4 }}>
                    <Input
                      value={
                        splitValues[p.id] === undefined || splitValues[p.id] === ''
                          ? ''
                          : String(splitValues[p.id])
                      }
                      onChangeText={(v) => {
                        setSplitValues((prev) => ({ ...prev, [p.id]: v.replace(/[^0-9.]/g, '') }));
                        setError('');
                      }}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      style={{
                        width: 78,
                        textAlign: 'right',
                        paddingVertical: 8,
                        fontSize: 15,
                        backgroundColor: t.card,
                      }}
                    />
                    <Text style={[font.small, { color: t.textMuted, width: 16 }]}>
                      {splitMode === 'percent' ? '%' : splitMode === 'shares' ? 'sh' : sym}
                    </Text>
                  </Row>
                )}
              </Row>
            </View>
          );
        })}
      </View>

      <Field label="Notes (optional)">
        <Input
          value={notes}
          onChangeText={setNotes}
          placeholder="Anything worth remembering…"
          multiline
          style={{ minHeight: 72, textAlignVertical: 'top' }}
        />
      </Field>

      {editing ? (
        <Button
          title="Delete expense"
          variant="ghost"
          icon="trash-outline"
          full
          onPress={() => {
            dispatch({ type: 'DELETE_EXPENSE', id: expense.id });
            notify('warning');
            onClose();
          }}
        />
      ) : null}
    </Sheet>
  );
}
