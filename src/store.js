import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { avatarColors } from './theme';

const KEY = 'splitlocal:v1';

export const CURRENCIES = [
  { code: 'INR', symbol: '₹' },
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'JPY', symbol: '¥' },
  { code: 'AUD', symbol: 'A$' },
  { code: 'CAD', symbol: 'C$' },
];

export const CATEGORIES = [
  { id: 'general', label: 'General', icon: 'receipt-outline', color: '#7C5CFF' },
  { id: 'food', label: 'Food & Drink', icon: 'fast-food-outline', color: '#FF6B6B' },
  { id: 'groceries', label: 'Groceries', icon: 'cart-outline', color: '#84CC16' },
  { id: 'transport', label: 'Transport', icon: 'car-outline', color: '#38BDF8' },
  { id: 'home', label: 'Home', icon: 'home-outline', color: '#FFB020' },
  { id: 'travel', label: 'Travel', icon: 'airplane-outline', color: '#22D3EE' },
  { id: 'fun', label: 'Entertainment', icon: 'game-controller-outline', color: '#F472B6' },
  { id: 'health', label: 'Health', icon: 'fitness-outline', color: '#2BD4A6' },
  { id: 'bills', label: 'Bills', icon: 'flash-outline', color: '#FB923C' },
  { id: 'gift', label: 'Gifts', icon: 'gift-outline', color: '#A78BFA' },
];

export const categoryById = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[0];
export const currencySymbol = (code) =>
  (CURRENCIES.find((c) => c.code === code) || CURRENCIES[0]).symbol;

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const initials = (name = '?') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?';

export const colorFor = (id = '') => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return avatarColors[h % avatarColors.length];
};

const ME = 'me';

const initialState = {
  ready: false,
  themeMode: 'light',
  accent: 'teal',
  currency: 'INR',
  people: [{ id: ME, name: 'You' }],
  groups: [],
  expenses: [],
  settlements: [],
};

function reducer(state, action) {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, ...action.payload, ready: true };
    case 'SET':
      return { ...state, ...action.payload };

    case 'ADD_PERSON':
      return { ...state, people: [...state.people, action.person] };
    case 'UPDATE_PERSON':
      return {
        ...state,
        people: state.people.map((p) =>
          p.id === action.person.id ? { ...p, ...action.person } : p
        ),
      };
    case 'DELETE_PERSON':
      return {
        ...state,
        people: state.people.filter((p) => p.id !== action.id),
        groups: state.groups.map((g) => ({
          ...g,
          memberIds: g.memberIds.filter((m) => m !== action.id),
        })),
      };

    case 'ADD_GROUP':
      return { ...state, groups: [action.group, ...state.groups] };
    case 'UPDATE_GROUP':
      return {
        ...state,
        groups: state.groups.map((g) =>
          g.id === action.group.id ? { ...g, ...action.group } : g
        ),
      };
    case 'DELETE_GROUP':
      return {
        ...state,
        groups: state.groups.filter((g) => g.id !== action.id),
        expenses: state.expenses.filter((e) => e.groupId !== action.id),
        settlements: state.settlements.filter((s) => s.groupId !== action.id),
      };

    case 'ADD_EXPENSE':
      return { ...state, expenses: [action.expense, ...state.expenses] };
    case 'UPDATE_EXPENSE':
      return {
        ...state,
        expenses: state.expenses.map((e) =>
          e.id === action.expense.id ? { ...e, ...action.expense } : e
        ),
      };
    case 'DELETE_EXPENSE':
      return { ...state, expenses: state.expenses.filter((e) => e.id !== action.id) };

    case 'ADD_SETTLEMENT':
      return { ...state, settlements: [action.settlement, ...state.settlements] };
    case 'DELETE_SETTLEMENT':
      return { ...state, settlements: state.settlements.filter((s) => s.id !== action.id) };

    case 'RESET':
      return {
        ...initialState,
        ready: true,
        themeMode: state.themeMode,
        accent: state.accent,
        currency: state.currency,
      };
    default:
      return state;
  }
}

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const hydrated = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          dispatch({ type: 'HYDRATE', payload: { ...initialState, ...saved } });
        } else {
          dispatch({ type: 'HYDRATE', payload: {} });
        }
      } catch {
        dispatch({ type: 'HYDRATE', payload: {} });
      } finally {
        hydrated.current = true;
      }
    })();
  }, []);

  useEffect(() => {
    if (!state.ready || !hydrated.current) return;
    const { ready, ...persist } = state;
    AsyncStorage.setItem(KEY, JSON.stringify(persist)).catch(() => {});
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}

export const MY_ID = ME;

/* ---------- money helpers ---------- */

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + 's'}`;

export const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export const fmt = (amount, code) => {
  const sym = currencySymbol(code);
  const neg = amount < 0;
  const v = Math.abs(round2(amount));
  const s = v.toLocaleString(undefined, {
    minimumFractionDigits: v % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${neg ? '-' : ''}${sym}${s}`;
};

/**
 * Split an amount across participants, distributing rounding remainder
 * one cent at a time so the shares always sum exactly to the total.
 */
export function computeShares(expense) {
  const { amount, splitMode, participants, splitValues = {} } = expense;
  const ids = participants;
  if (!ids.length) return {};
  const cents = Math.round(amount * 100);
  const out = {};

  if (splitMode === 'exact') {
    ids.forEach((id) => {
      out[id] = round2(Number(splitValues[id]) || 0);
    });
    return out;
  }

  let weights;
  if (splitMode === 'shares') {
    weights = ids.map((id) => Math.max(0, Number(splitValues[id]) || 0));
  } else if (splitMode === 'percent') {
    weights = ids.map((id) => Math.max(0, Number(splitValues[id]) || 0));
  } else {
    weights = ids.map(() => 1);
  }

  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) {
    ids.forEach((id) => (out[id] = 0));
    return out;
  }

  const raw = weights.map((w) => (cents * w) / total);
  const floors = raw.map((r) => Math.floor(r));
  let remainder = cents - floors.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < remainder; k++) floors[order[k % order.length].i] += 1;

  ids.forEach((id, i) => (out[id] = floors[i] / 100));
  return out;
}

/** Net balance per person across a set of expenses + settlements. positive = they are owed */
export function computeBalances(expenses, settlements) {
  const bal = {};
  const add = (id, v) => (bal[id] = round2((bal[id] || 0) + v));

  expenses.forEach((e) => {
    const shares = computeShares(e);
    const payers = e.payers || { [e.paidBy]: e.amount };
    Object.entries(payers).forEach(([id, v]) => add(id, Number(v) || 0));
    Object.entries(shares).forEach(([id, v]) => add(id, -v));
  });

  settlements.forEach((s) => {
    add(s.from, Number(s.amount) || 0);
    add(s.to, -(Number(s.amount) || 0));
  });

  Object.keys(bal).forEach((k) => {
    if (Math.abs(bal[k]) < 0.005) bal[k] = 0;
  });
  return bal;
}

/** Greedy minimal-transaction debt simplification. */
export function simplifyDebts(balances) {
  const debtors = [];
  const creditors = [];
  Object.entries(balances).forEach(([id, v]) => {
    if (v < -0.005) debtors.push({ id, amt: -v });
    else if (v > 0.005) creditors.push({ id, amt: v });
  });
  debtors.sort((a, b) => b.amt - a.amt);
  creditors.sort((a, b) => b.amt - a.amt);

  const tx = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amt, creditors[j].amt);
    if (pay > 0.005) tx.push({ from: debtors[i].id, to: creditors[j].id, amount: round2(pay) });
    debtors[i].amt = round2(debtors[i].amt - pay);
    creditors[j].amt = round2(creditors[j].amt - pay);
    if (debtors[i].amt <= 0.005) i++;
    if (creditors[j].amt <= 0.005) j++;
  }
  return tx;
}

/* ---------- selectors ---------- */

export function useSelectors() {
  const { state } = useStore();

  return useMemo(() => {
    const personById = (id) =>
      state.people.find((p) => p.id === id) || { id, name: 'Unknown' };

    const groupExpenses = (gid) => state.expenses.filter((e) => e.groupId === gid);
    const groupSettlements = (gid) => state.settlements.filter((s) => s.groupId === gid);

    const groupBalances = (gid) =>
      computeBalances(groupExpenses(gid), groupSettlements(gid));

    const overallBalances = computeBalances(state.expenses, state.settlements);

    // per-friend net across everything, from my perspective
    const friendNet = {};
    const accumulate = (expenses, settlements) => {
      const b = computeBalances(expenses, settlements);
      return b;
    };
    // Build pairwise ledger: what each person owes me directly, derived per group
    const pairwise = {};
    const bump = (a, b, v) => {
      pairwise[a] = pairwise[a] || {};
      pairwise[a][b] = round2((pairwise[a][b] || 0) + v);
    };

    const scopes = [
      ...state.groups.map((g) => g.id),
      null, // non-group (direct) expenses
    ];
    scopes.forEach((gid) => {
      const exp = state.expenses.filter((e) => (e.groupId || null) === gid);
      const set = state.settlements.filter((s) => (s.groupId || null) === gid);
      if (!exp.length && !set.length) return;
      const b = accumulate(exp, set);
      simplifyDebts(b).forEach((t) => {
        bump(t.from, t.to, -t.amount);
        bump(t.to, t.from, t.amount);
      });
    });

    Object.entries(pairwise[MY_ID] || {}).forEach(([id, v]) => {
      if (Math.abs(v) > 0.005) friendNet[id] = v;
    });

    const myTotal = Object.values(friendNet).reduce((a, b) => a + b, 0);
    const owedToMe = Object.values(friendNet)
      .filter((v) => v > 0)
      .reduce((a, b) => a + b, 0);
    const iOwe = Object.values(friendNet)
      .filter((v) => v < 0)
      .reduce((a, b) => a + Math.abs(b), 0);

    return {
      personById,
      groupExpenses,
      groupSettlements,
      groupBalances,
      overallBalances,
      friendNet,
      myTotal: round2(myTotal),
      owedToMe: round2(owedToMe),
      iOwe: round2(iOwe),
    };
  }, [state]);
}
