import React, { useMemo, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  AvatarStack,
  Button,
  Card,
  Chip,
  Empty,
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
import { accentGlow, font, radius } from '../theme';
import { MY_ID, fmt, uid, useSelectors, useStore } from '../store';


const GROUP_TYPES = [
  { id: 'trip', label: 'Trip', icon: 'airplane-outline', color: '#22D3EE' },
  { id: 'home', label: 'Home', icon: 'home-outline', color: '#FFB020' },
  { id: 'couple', label: 'Couple', icon: 'heart-outline', color: '#F472B6' },
  { id: 'friends', label: 'Friends', icon: 'people-outline', color: '#7C5CFF' },
  { id: 'work', label: 'Work', icon: 'briefcase-outline', color: '#38BDF8' },
  { id: 'other', label: 'Other', icon: 'grid-outline', color: '#84CC16' },
];
export const groupType = (id) => GROUP_TYPES.find((g) => g.id === id) || GROUP_TYPES[3];

export default function GroupsScreen({ onOpenGroup }) {
  const { state, dispatch } = useStore();
  const sel = useSelectors();
  const t = useTheme();
  const [creating, setCreating] = useState(false);

  const rows = useMemo(
    () =>
      state.groups.map((g) => {
        const bal = sel.groupBalances(g.id);
        const mine = bal[MY_ID] || 0;
        const members = g.memberIds.map(sel.personById);
        const count = sel.groupExpenses(g.id).length;
        return { group: g, mine, members, count };
      }),
    [state.groups, state.expenses, state.settlements, state.people]
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Hero>
        <View style={{ paddingTop: 8, gap: 4 }}>
          <Text style={[font.h1, { color: '#fff' }]}>Groups</Text>
          <Text style={[font.small, { color: 'rgba(255,255,255,0.85)' }]}>
            {state.groups.length} {state.groups.length === 1 ? 'group' : 'groups'} ·{' '}
            {state.expenses.filter((e) => e.groupId).length} expenses
          </Text>
        </View>
      </Hero>

      <FlatList
        data={rows}
        keyExtractor={(r) => r.group.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 12 }}
        ListEmptyComponent={
          <Empty
            icon="people-circle-outline"
            title="No groups yet"
            subtitle="Create a group for a trip, a flat, or anything you split regularly."
            action={<Button title="Create a group" icon="add" onPress={() => setCreating(true)} />}
          />
        }
        renderItem={({ item, index }) => {
          const gt = groupType(item.group.type);
          const owed = item.mine > 0.005;
          const owes = item.mine < -0.005;
          return (
            <FadeIn delay={index * 45}>
              <Card onPress={() => onOpenGroup(item.group.id)}>
                <Row>
                  <IconBadge icon={gt.icon} color={gt.color} size={48} />
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text numberOfLines={1} style={[font.h3, { color: t.text }]}>
                      {item.group.name}
                    </Text>
                    <Text style={[font.small, { color: t.textMuted }]}>
                      {item.members.length}{' '}
                      {item.members.length === 1 ? 'member' : 'members'} · {item.count}{' '}
                      {item.count === 1 ? 'expense' : 'expenses'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 3 }}>
                    <Text
                      style={[
                        font.h3,
                        { color: owed ? t.positive : owes ? t.negative : t.textFaint },
                      ]}
                    >
                      {item.mine === 0 ? '—' : fmt(Math.abs(item.mine), state.currency)}
                    </Text>
                    <Text style={[font.tiny, { color: t.textFaint }]}>
                      {owed ? 'YOU GET' : owes ? 'YOU OWE' : 'SETTLED'}
                    </Text>
                  </View>
                </Row>
                <Row style={{ marginTop: 12, justifyContent: 'space-between' }}>
                  <AvatarStack people={item.members} size={26} />
                  <Ionicons name="chevron-forward" size={18} color={t.textFaint} />
                </Row>
              </Card>
            </FadeIn>
          );
        }}
      />

      <Fab onPress={() => setCreating(true)} icon="add" />
      <GroupEditor visible={creating} onClose={() => setCreating(false)} />
    </View>
  );
}

export function Fab({ onPress, icon = 'add', label }) {
  const t = useTheme();
  return (
    <View style={{ position: 'absolute', right: 20, bottom: 24 }}>
      <Squish
        onPress={onPress}
        haptic="medium"
        style={{
          backgroundColor: t.action,
          height: 58,
          minWidth: 58,
          paddingHorizontal: label ? 22 : 0,
          borderRadius: 29,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          ...accentGlow(t.action, 12),
        }}
      >
        <Ionicons name={icon} size={28} color={t.onAction} />
        {label ? (
          <Text style={{ color: t.onAction, fontWeight: '800', fontSize: 15 }}>{label}</Text>
        ) : null}
      </Squish>
    </View>
  );
}

export function GroupEditor({ visible, onClose, group }) {
  const { state, dispatch } = useStore();
  const t = useTheme();
  const editing = !!group;

  const [name, setName] = useState('');
  const [type, setType] = useState('friends');
  const [memberIds, setMemberIds] = useState([MY_ID]);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (!visible) return;
    setName(group?.name || '');
    setType(group?.type || 'friends');
    setMemberIds(group?.memberIds || [MY_ID]);
    setNewName('');
    setError('');
  }, [visible, group]);

  const addPerson = () => {
    const n = newName.trim();
    if (!n) return;
    const existing = state.people.find(
      (p) => p.name.toLowerCase() === n.toLowerCase()
    );
    const id = existing?.id || uid();
    if (!existing) dispatch({ type: 'ADD_PERSON', person: { id, name: n } });
    setMemberIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setNewName('');
  };

  const save = () => {
    if (!name.trim()) {
      setError('Name your group.');
      return;
    }
    if (memberIds.length < 2) {
      setError('A group needs at least two people.');
      return;
    }
    const payload = {
      id: group?.id || uid(),
      name: name.trim(),
      type,
      memberIds,
      createdAt: group?.createdAt || new Date().toISOString(),
    };
    dispatch({ type: editing ? 'UPDATE_GROUP' : 'ADD_GROUP', group: payload });
    notify('success');
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={editing ? 'Edit group' : 'New group'}
      footer={
        <View style={{ gap: 8 }}>
          {error ? <Text style={[font.small, { color: t.negative }]}>{error}</Text> : null}
          <Button title={editing ? 'Save group' : 'Create group'} onPress={save} full />
        </View>
      }
    >
      <Field label="Group name">
        <Input
          value={name}
          onChangeText={(v) => {
            setName(v);
            setError('');
          }}
          placeholder="Goa trip, Flat 3B…"
        />
      </Field>

      <Field label="Type">
        <Row style={{ flexWrap: 'wrap', gap: 8 }}>
          {GROUP_TYPES.map((g) => (
            <Chip
              key={g.id}
              label={g.label}
              icon={g.icon}
              color={g.color}
              active={type === g.id}
              onPress={() => setType(g.id)}
            />
          ))}
        </Row>
      </Field>

      <Field label="Members" hint="Tap a name to add or remove them from this group.">
        <Row style={{ flexWrap: 'wrap', gap: 8 }}>
          {state.people.map((p) => (
            <Chip
              key={p.id}
              label={p.id === MY_ID ? 'You' : p.name}
              active={memberIds.includes(p.id)}
              onPress={() => {
                if (p.id === MY_ID) return;
                setMemberIds((prev) =>
                  prev.includes(p.id) ? prev.filter((m) => m !== p.id) : [...prev, p.id]
                );
                setError('');
              }}
            />
          ))}
        </Row>
      </Field>

      <Row>
        <Input
          value={newName}
          onChangeText={setNewName}
          placeholder="Add someone new"
          onSubmitEditing={addPerson}
          returnKeyType="done"
          style={{ flex: 1 }}
        />
        <Button title="Add" variant="soft" onPress={addPerson} icon="person-add-outline" />
      </Row>
    </Sheet>
  );
}
