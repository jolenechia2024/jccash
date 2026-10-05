import { useEffect, useState } from "react";

export const CATEGORIES = [
  "Food",
  "Transport",
  "Travel",
  "Rent",
  "Groceries",
  "Shopping",
  "Sports",
  "Gifts",
  "Fun",
  "Other",
] as const;

export const CURRENCIES = [
  "AED",
  "AUD",
  "CAD",
  "CHF",
  "CNY",
  "CZK",
  "DKK",
  "EUR",
  "GBP",
  "HKD",
  "HUF",
  "IDR",
  "ILS",
  "INR",
  "JPY",
  "KRW",
  "MXN",
  "MYR",
  "NOK",
  "NZD",
  "PHP",
  "PLN",
  "SEK",
  "SGD",
  "THB",
  "TRY",
  "TWD",
  "USD",
  "VND",
  "ZAR",
] as const;
export type Category = (typeof CATEGORIES)[number];
export const CAT_EMOJI: Record<string, string> = {
  Food: "🍜",
  Transport: "🚆",
  Travel: "✈️",
  Rent: "🏠",
  Groceries: "🛒",
  Shopping: "🛍️",
  Sports: "🏃",
  Gifts: "🎁",
  Fun: "🎉",
  Other: "✦",
};

export type Expense = {
  id: string;
  amount: number;
  currency: string;
  rate: number;
  category: string;
  note: string;
  method: "card" | "cash";
  trip: string;
  date: string;
};

// Legacy type — kept only for migration
export type Split = {
  id: string;
  name: string;
  amount: number;
  currency: string;
  note: string;
  paid: boolean;
  direction?: "owed_to_me" | "i_owe";
};

export type LedgerEntry = {
  id: string;
  person: string; // normalised: trimmed, original casing preserved
  type: "bill" | "payment";
  direction: "owed_to_me" | "i_owe";
  amountSGD: number; // always in SGD, 2 dp
  originalAmount: number;
  currency: string;
  rate: number; // 1 originalCurrency = rate SGD
  note: string;
  date: string; // ISO
};

export type Recurring = {
  id: string;
  label: string;
  amount: number;
  category: string;
  lastAdded: string;
};

export type State = {
  budgetSgd: number;
  start: string;
  end: string;
  currency: string;
  rate: number;
  trips: string[];
  activeTrip: string;
  cashWithdrawn: number;
  expenses: Expense[];
  splits: Split[]; // kept for migration; treated as ledger after load
  ledger: LedgerEntry[];
  recurring: Recurring[];
  theme?: string;
  colorMode?: "light" | "dark" | "auto";
};

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const plus = (d: number) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);

const DEFAULT: State = {
  budgetSgd: 0,
  start: today(),
  end: plus(120),
  currency: "EUR",
  rate: 0,
  trips: ["Daily life"],
  activeTrip: "Daily life",
  cashWithdrawn: 0,
  expenses: [],
  splits: [],
  ledger: [],
  recurring: [],
};

const KEY = "jccash-v1";
export const uid = () => Math.random().toString(36).slice(2, 10);

// Migrate old Split[] to LedgerEntry[]. Paid splits get a matching payment entry.
function migrateSplits(splits: Split[]): LedgerEntry[] {
  const entries: LedgerEntry[] = [];
  for (const sp of splits) {
    const dir = sp.direction ?? "owed_to_me";
    const bill: LedgerEntry = {
      id: sp.id,
      person: sp.name.trim(),
      type: "bill",
      direction: dir,
      amountSGD: Math.round(sp.amount * 100) / 100,
      originalAmount: sp.amount,
      currency: "SGD",
      rate: 1,
      note: sp.note,
      date: new Date().toISOString(),
    };
    entries.push(bill);
    if (sp.paid) {
      const oppositeDir: "owed_to_me" | "i_owe" = dir === "owed_to_me" ? "i_owe" : "owed_to_me";
      entries.push({
        id: uid(),
        person: sp.name.trim(),
        type: "payment",
        direction: oppositeDir,
        amountSGD: Math.round(sp.amount * 100) / 100,
        originalAmount: sp.amount,
        currency: "SGD",
        rate: 1,
        note: "settled",
        date: new Date().toISOString(),
      });
    }
  }
  return entries;
}

function applyRecurring(s: State): State {
  const month = today().slice(0, 7);
  let changed = false;
  const expenses = [...s.expenses];
  const recurring = s.recurring.map((r) => {
    if (r.lastAdded === month) return r;
    changed = true;
    expenses.unshift({
      id: uid(),
      amount: r.amount,
      currency: s.currency,
      rate: s.rate,
      category: r.category,
      note: `${r.label} (monthly)`,
      method: "card",
      trip: s.activeTrip,
      date: new Date().toISOString(),
    });
    return { ...r, lastAdded: month };
  });
  return changed ? { ...s, expenses, recurring } : s;
}

export function useStore() {
  const [state, setState] = useState<State>(DEFAULT);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<State>;
        let s: State = { ...DEFAULT, ...parsed };
        // One-time migration: if splits exist but ledger is empty, migrate
        if ((s.splits?.length ?? 0) > 0 && (s.ledger?.length ?? 0) === 0) {
          s = { ...s, ledger: migrateSplits(s.splits), splits: [] };
        }
        if (!s.ledger) s = { ...s, ledger: [] };
        setState(applyRecurring(s));
      } else {
        setState(applyRecurring({ ...DEFAULT }));
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify(state));
  }, [state, ready]);
  const update = (fn: (s: State) => State) => setState((s) => applyRecurring(fn(s)));
  return { state, update, ready };
}

export const sgd = (e: Expense) => e.amount * e.rate;

// Returns net balance per person. Positive = they owe me, negative = I owe them.
export function personBalances(ledger: LedgerEntry[]): Record<string, number> {
  const bal: Record<string, number> = {};
  for (const e of ledger) {
    const key = e.person.trim().toLowerCase();
    if (!(key in bal)) bal[key] = 0;
    // owed_to_me entries add to balance (positive = they owe me)
    // i_owe entries subtract (negative = I owe them)
    const sign = e.direction === "owed_to_me" ? 1 : -1;
    bal[key] = Math.round(((bal[key] ?? 0) + sign * e.amountSGD) * 100) / 100;
  }
  return bal;
}

// Canonical display name (first seen casing)
export function personNames(ledger: LedgerEntry[]): Record<string, string> {
  const names: Record<string, string> = {};
  for (const e of ledger) {
    const key = e.person.trim().toLowerCase();
    if (!(key in names)) names[key] = e.person.trim();
  }
  return names;
}

export function stats(s: State) {
  const bals = personBalances(s.ledger ?? []);
  const owedToMe = Object.values(bals)
    .filter((v) => v > 0)
    .reduce((a, v) => a + v, 0);
  const iOwe = Object.values(bals)
    .filter((v) => v < 0)
    .reduce((a, v) => a + Math.abs(v), 0);
  const spent = s.expenses.reduce((a, e) => a + sgd(e), 0) - owedToMe + iOwe;
  const left = s.budgetSgd - spent;
  const end = new Date(s.end + "T23:59:59").getTime();
  const daysLeft = Math.max(1, Math.ceil((end - Date.now()) / 864e5));
  const t = today();
  const spentToday = s.expenses
    .filter((e) => e.date.slice(0, 10) === t)
    .reduce((a, e) => a + sgd(e), 0);
  const perDay = (left + spentToday) / daysLeft;
  const cashSpent = s.expenses
    .filter((e) => e.method === "cash" && e.currency === s.currency)
    .reduce((a, e) => a + e.amount, 0);
  const burnoutDate: Date | null = (() => {
    if (spent <= 0 || left <= 0) return null;
    const startMs = new Date(s.start).getTime();
    const daysElapsed = Math.max(1, (Date.now() - startMs) / 864e5);
    const daysToEmpty = left / (spent / daysElapsed);
    const forecast = new Date(Date.now() + daysToEmpty * 864e5);
    return forecast < new Date(s.end + "T23:59:59") ? forecast : null;
  })();
  return {
    spent,
    left,
    daysLeft,
    perDay,
    todayLeft: perDay - spentToday,
    perWeek: perDay * 7,
    cashLeft: s.cashWithdrawn - cashSpent,
    burnoutDate,
    owedToMe,
    iOwe,
  };
}

export const fmt = (n: number, d = 2) =>
  n.toLocaleString("en-SG", { minimumFractionDigits: d, maximumFractionDigits: d });

export function exportCsv(s: State) {
  const rows = [
    ["date", "amount", "currency", "rate_to_sgd", "sgd", "category", "method", "trip", "note"],
  ];
  s.expenses.forEach((e) =>
    rows.push([
      e.date,
      String(e.amount),
      e.currency,
      String(e.rate),
      sgd(e).toFixed(2),
      e.category,
      e.method,
      e.trip,
      e.note,
    ]),
  );
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = `jccash-${today()}.csv`;
  a.click();
}
