import { useEffect, useState } from "react";

export const CATEGORIES = ["Food", "Transport", "Travel", "Rent", "Groceries", "Fun", "Other"] as const;

export const CURRENCIES = [
  "AED", "AUD", "CAD", "CHF", "CNY", "CZK", "DKK", "EUR", "GBP",
  "HKD", "HUF", "IDR", "ILS", "INR", "JPY", "KRW", "MXN", "MYR",
  "NOK", "NZD", "PHP", "PLN", "SEK", "SGD", "THB", "TRY", "TWD", "USD", "VND", "ZAR",
] as const;
export type Category = (typeof CATEGORIES)[number];
export const CAT_EMOJI: Record<string, string> = {
  Food: "🍜", Transport: "🚆", Travel: "✈️", Rent: "🏠", Groceries: "🛒", Fun: "🎉", Other: "✦",
};

export type Expense = {
  id: string; amount: number; currency: string; rate: number; category: string;
  note: string; method: "card" | "cash"; trip: string; date: string;
};
export type Split = { id: string; name: string; amount: number; currency: string; note: string; paid: boolean };
export type Recurring = { id: string; label: string; amount: number; category: string; lastAdded: string };

export type State = {
  budgetSgd: number; start: string; end: string;
  currency: string; rate: number; // 1 local = rate SGD
  trips: string[]; activeTrip: string;
  cashWithdrawn: number; // local currency
  expenses: Expense[]; splits: Split[]; recurring: Recurring[];
};

const today = () => new Date().toISOString().slice(0, 10);
const plus = (d: number) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);

const DEFAULT: State = {
  budgetSgd: 0, start: today(), end: plus(120), currency: "EUR", rate: 0,
  trips: ["Daily life"], activeTrip: "Daily life", cashWithdrawn: 0,
  expenses: [], splits: [], recurring: [],
};

const KEY = "jccash-v1";
export const uid = () => Math.random().toString(36).slice(2, 10);

function applyRecurring(s: State): State {
  const month = today().slice(0, 7);
  let changed = false;
  const expenses = [...s.expenses];
  const recurring = s.recurring.map((r) => {
    if (r.lastAdded === month) return r;
    changed = true;
    expenses.unshift({
      id: uid(), amount: r.amount, currency: s.currency, rate: s.rate, category: r.category,
      note: `${r.label} (monthly)`, method: "card", trip: s.activeTrip, date: new Date().toISOString(),
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
      const s = raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT;
      setState(applyRecurring(s));
    } catch { /* ignore */ }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem(KEY, JSON.stringify(state)); }, [state, ready]);
  const update = (fn: (s: State) => State) => setState((s) => applyRecurring(fn(s)));
  return { state, update, ready };
}

export const sgd = (e: Expense) => e.amount * e.rate;

export function stats(s: State) {
  const spent = s.expenses.reduce((a, e) => a + sgd(e), 0);
  const left = s.budgetSgd - spent;
  const end = new Date(s.end + "T23:59:59").getTime();
  const daysLeft = Math.max(1, Math.ceil((end - Date.now()) / 864e5));
  const t = today();
  const spentToday = s.expenses.filter((e) => e.date.slice(0, 10) === t).reduce((a, e) => a + sgd(e), 0);
  const perDay = (left + spentToday) / daysLeft;
  const cashSpent = s.expenses.filter((e) => e.method === "cash" && e.currency === s.currency).reduce((a, e) => a + e.amount, 0);
  return { spent, left, daysLeft, perDay, todayLeft: perDay - spentToday, perWeek: perDay * 7, cashLeft: s.cashWithdrawn - cashSpent };
}

export const fmt = (n: number, d = 2) => n.toLocaleString("en-SG", { minimumFractionDigits: d, maximumFractionDigits: d });

export function exportCsv(s: State) {
  const rows = [["date", "amount", "currency", "rate_to_sgd", "sgd", "category", "method", "trip", "note"]];
  s.expenses.forEach((e) => rows.push([e.date, String(e.amount), e.currency, String(e.rate), sgd(e).toFixed(2), e.category, e.method, e.trip, e.note]));
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = `jccash-${today()}.csv`;
  a.click();
}
