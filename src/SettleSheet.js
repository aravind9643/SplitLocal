import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Avatar,
  Button,
  Field,
  Input,
  Row,
  Sheet,
  Squish,
  notify,
  useTheme,
} from './ui';
import { font, radius } from './theme';
import { MY_ID, currencySymbol, fmt, round2, uid, useSelectors, useStore } from './store';

export default function SettleSheet({ visible, onClose, groupId, transactions = [], preset }) {
  const { state, dispatch } = useStore();
  const sel = useSelectors();
  const t = useTheme();

  const [from, setFrom] = useState(MY_ID);
  const [to, setTo] = useState(null);
  const [amountText, setAmountText] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    const p = preset || transactions.find((x) => x.from === MY_ID || x.to === MY_ID) || transactions[0];
    setFrom(p?.from || MY_ID);
    setTo(p?.to || null);
    setAmountText(p ? String(round2(p.amount)) : '');
    setNote('');
    setError('');
  }, [visible, preset, transactions]);

  const amount = round2(parseFloat(amountText.replace(',', '.')) || 0);
  const fromP = sel.personById(from);
  const toP = to ? sel.personById(to) : null;

  const save = () => {
    if (!to || from === to) {
      setError('Pick who paid and who received.');
      return;
    }
    if (!(amount > 0)) {
      setError('Enter an amount greater than zero.');
      return;
    }
    dispatch({
      type: 'ADD_SETTLEMENT',
      settlement: {
        id: uid(),
        groupId: groupId || null,
        from,
        to,
        amount,
        note: note.trim(),
        date: new Date().toISOString(),
      },
    });
    notify('success');
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Record a payment"
      footer={
        <View style={{ gap: 8 }}>
          {error ? <Text style={[font.small, { color: t.negative }]}>{error}</Text> : null}
          <Button title="Record payment" icon="checkmark-done-outline" onPress={save} full />
        </View>
      }
    >
      {transactions.length > 0 ? (
        <Field label="Suggested">
          <View style={{ gap: 8 }}>
            {transactions.map((tx, i) => {
              const f = sel.personById(tx.from);
              const to2 = sel.personById(tx.to);
              const active = from === tx.from && to === tx.to;
              return (
                <Squish
                  key={i}
                  onPress={() => {
                    setFrom(tx.from);
                    setTo(tx.to);
                    setAmountText(String(round2(tx.amount)));
                    setError('');
                  }}
                  style={{
                    backgroundColor: active ? t.primary + '1F' : t.cardAlt,
                    borderRadius: radius.md,
                    padding: 12,
                    borderWidth: 1.5,
                    borderColor: active ? t.primary : 'transparent',
                  }}
                >
                  <Row>
                    <Avatar id={f.id} name={f.name} size={30} />
                    <Ionicons name="arrow-forward" size={15} color={t.textFaint} />
                    <Avatar id={to2.id} name={to2.name} size={30} />
                    <Text style={[font.small, { color: t.textMuted, flex: 1 }]} numberOfLines={1}>
                      {f.id === MY_ID ? 'You' : f.name} → {to2.id === MY_ID ? 'you' : to2.name}
                    </Text>
                    <Text style={[font.h3, { color: t.text }]}>
                      {fmt(tx.amount, state.currency)}
                    </Text>
                  </Row>
                </Squish>
              );
            })}
          </View>
        </Field>
      ) : null}

      <Row style={{ gap: 10 }}>
        <PersonPicker
          label="Paid by"
          value={from}
          onChange={(v) => {
            setFrom(v);
            setError('');
          }}
        />
        <Ionicons name="arrow-forward" size={20} color={t.textFaint} style={{ marginTop: 22 }} />
        <PersonPicker
          label="Received by"
          value={to}
          onChange={(v) => {
            setTo(v);
            setError('');
          }}
        />
      </Row>

      <Field label="Amount">
        <Row>
          <Text style={{ color: t.textMuted, fontSize: 22, fontWeight: '700' }}>
            {currencySymbol(state.currency)}
          </Text>
          <Input
            value={amountText}
            onChangeText={(v) => {
              setAmountText(v.replace(/[^0-9.,]/g, ''));
              setError('');
            }}
            keyboardType="decimal-pad"
            placeholder="0"
            style={{ flex: 1, fontSize: 22, fontWeight: '700' }}
          />
        </Row>
      </Field>

      <Field label="Note (optional)">
        <Input value={note} onChangeText={setNote} placeholder="UPI, cash, bank transfer…" />
      </Field>
    </Sheet>
  );
}

function PersonPicker({ label, value, onChange }) {
  const { state } = useStore();
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const person = state.people.find((p) => p.id === value);

  return (
    <View style={{ flex: 1, gap: 8 }}>
      <Text style={[font.tiny, { color: t.textFaint, textTransform: 'uppercase' }]}>{label}</Text>
      <Squish
        onPress={() => setOpen(true)}
        style={{
          backgroundColor: t.cardAlt,
          borderRadius: radius.md,
          padding: 10,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {person ? <Avatar id={person.id} name={person.name} size={28} /> : null}
        <Text numberOfLines={1} style={[font.small, { color: person ? t.text : t.textFaint, flex: 1 }]}>
          {person ? (person.id === MY_ID ? 'You' : person.name) : 'Choose…'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={t.textFaint} />
      </Squish>

      <Sheet visible={open} onClose={() => setOpen(false)} title={label}>
        <View style={{ gap: 4 }}>
          {state.people.map((p) => (
            <Squish
              key={p.id}
              onPress={() => {
                onChange(p.id);
                setOpen(false);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                borderRadius: radius.md,
                backgroundColor: value === p.id ? t.primary + '18' : 'transparent',
              }}
            >
              <Avatar id={p.id} name={p.name} size={36} />
              <Text style={[font.body, { color: t.text, flex: 1, fontWeight: '600' }]}>
                {p.id === MY_ID ? 'You' : p.name}
              </Text>
              {value === p.id ? (
                <Ionicons name="checkmark-circle" size={22} color={t.primary} />
              ) : null}
            </Squish>
          ))}
        </View>
      </Sheet>
    </View>
  );
}
