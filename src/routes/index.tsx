import { createFileRoute } from "@tanstack/react-router";
import capybaraLogo from "@/assets/capybara-logo.png";
import { useState, useEffect, useRef, type ChangeEvent } from "react";
import {
  CATEGORIES,
  CURRENCIES,
  CAT_EMOJI,
  exportCsv,
  fmt,
  sgd,
  stats,
  uid,
  useStore,
  personBalances,
  personNames,
  type Expense,
  type LedgerEntry,
  type State,
} from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "jccash — exchange budget tracker" },
      {
        name: "description",
        content:
          "Log spending in 2 taps, see SGD equivalents and how much you can spend per day. Offline, no login.",
      },
      { property: "og:title", content: "jccash — exchange budget tracker" },
      {
        property: "og:description",
        content: "Two-tap expense logging with daily budget left, multi-currency and split bills.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: App,
});

type Tab = "home" | "stats" | "split" | "settings";
type Upd = (fn: (s: State) => State) => void;

type ThemeVariant = { primary: string; foreground: string };
const THEMES: Record<string, { label: string; dark: ThemeVariant; light: ThemeVariant }> = {
  green: {
    label: "Green",
    dark: { primary: "oklch(0.82 0.2 150)", foreground: "oklch(0.13 0.005 150)" },
    light: { primary: "oklch(0.50 0.2 150)", foreground: "oklch(0.97 0.004 150)" },
  },
  blue: {
    label: "Blue",
    dark: { primary: "oklch(0.72 0.18 240)", foreground: "oklch(0.13 0.005 240)" },
    light: { primary: "oklch(0.45 0.18 240)", foreground: "oklch(0.97 0.004 240)" },
  },
  purple: {
    label: "Purple",
    dark: { primary: "oklch(0.72 0.2 300)", foreground: "oklch(0.13 0.005 300)" },
    light: { primary: "oklch(0.48 0.2 300)", foreground: "oklch(0.97 0.004 300)" },
  },
  pink: {
    label: "Pink",
    dark: { primary: "oklch(0.88 0.07 5)", foreground: "oklch(0.20 0.01 5)" },
    light: { primary: "oklch(0.72 0.12 5)", foreground: "oklch(0.97 0.004 5)" },
  },
  gold: {
    label: "Gold",
    dark: { primary: "oklch(0.82 0.18 80)", foreground: "oklch(0.13 0.005 80)" },
    light: { primary: "oklch(0.55 0.18 80)", foreground: "oklch(0.97 0.004 80)" },
  },
};

function App() {
  const { state, update } = useStore();
  const [tab, setTab] = useState<Tab>("home");
  const [adding, setAdding] = useState(false);
  const [preFillSplit, setPreFillSplit] = useState<Expense | null>(null);
  const [systemDark, setSystemDark] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const colorMode = state.colorMode ?? "auto";
  const isDark = colorMode === "dark" || (colorMode === "auto" && systemDark);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
    }
  }, [isDark]);

  const handleSplitFromExpense = (expense: Expense) => {
    setPreFillSplit(expense);
    setTab("split");
  };

  const themeKey = state.theme ?? "green";
  const themeEntry = THEMES[themeKey] ?? THEMES["green"];
  const themeVariant = isDark ? themeEntry!.dark : themeEntry!.light;
  const themeVars = {
    "--primary": themeVariant.primary,
    "--primary-foreground": themeVariant.foreground,
    "--ring": themeVariant.primary,
  } as React.CSSProperties;

  return (
    <div className="relative min-h-dvh overflow-hidden" style={themeVars}>
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-32 -left-24 size-[420px] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute top-1/2 -right-32 size-[380px] rounded-full bg-accent/15 blur-[130px]" />
      </div>
      <div className="relative mx-auto max-w-md px-5 pb-32 pt-6">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src={capybaraLogo}
              alt="jccash capybara"
              width={1024}
              height={1024}
              className="size-9 rounded-lg ring-1 ring-primary/40"
            />
            <span className="text-sm font-semibold uppercase tracking-[0.25em]">jccash</span>
          </div>
          <select
            value={state.activeTrip}
            onChange={(e) => update((s) => ({ ...s, activeTrip: e.target.value }))}
            className="rounded-full border bg-muted px-3 py-1.5 text-xs text-muted-foreground outline-none"
          >
            {state.trips.map((t) => (
              <option key={t} className="bg-background">
                {t}
              </option>
            ))}
          </select>
        </header>

        {tab === "home" && (
          <Home state={state} update={update} onSplitExpense={handleSplitFromExpense} />
        )}
        {tab === "stats" && (
          <Stats state={state} update={update} onSplitExpense={handleSplitFromExpense} />
        )}
        {tab === "split" && (
          <SplitView state={state} update={update} preFillExpense={preFillSplit} />
        )}
        {tab === "settings" && <Settings state={state} update={update} isDark={isDark} />}
      </div>

      {adding && <QuickAdd state={state} update={update} onClose={() => setAdding(false)} />}

      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md px-4 pb-4">
        <div className="glass flex items-center justify-around px-2 py-2">
          {(["home", "stats"] as Tab[]).map((t) => (
            <NavBtn key={t} t={t} tab={tab} setTab={setTab} />
          ))}
          <button
            onClick={() => setAdding(true)}
            aria-label="Add expense"
            className="-mt-8 grid size-14 place-items-center rounded-full bg-primary text-2xl font-bold text-primary-foreground shadow-[0_0_30px_-4px_var(--primary)] ring-4 ring-background transition active:scale-90"
          >
            +
          </button>
          {(["split", "settings"] as Tab[]).map((t) => (
            <NavBtn key={t} t={t} tab={tab} setTab={setTab} />
          ))}
        </div>
      </nav>
    </div>
  );
}

function NavBtn({ t, tab, setTab }: { t: Tab; tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <button
      onClick={() => setTab(t)}
      className={`rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-widest transition ${tab === t ? "text-primary" : "text-muted-foreground"}`}
    >
      {t}
    </button>
  );
}

function SwipeRow({ onDelete, children }: { onDelete: () => void; children: React.ReactNode }) {
  const [dx, setDx] = useState(0);
  const startX = useRef(0);
  const dragging = useRef(false);
  const THRESHOLD = 80;

  const onDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    dragging.current = true;
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    setDx(Math.min(0, e.clientX - startX.current));
  };
  const onUp = () => {
    dragging.current = false;
    if (dx < -THRESHOLD) onDelete();
    setDx(0);
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div className="absolute inset-y-0 right-0 flex items-center bg-accent px-5">
        <span className="text-xs font-bold uppercase tracking-widest text-white">Delete</span>
      </div>
      <div
        className={dx === 0 ? "transition-transform duration-200" : ""}
        style={{ transform: `translateX(${dx}px)` }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        onPointerCancel={onUp}
      >
        {children}
      </div>
    </div>
  );
}

function useCurrencyRate(currency: string, baseCurrency: string, baseRate: number) {
  const [rate, setRate] = useState<number | null>(null);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (currency === baseCurrency) {
      setRate(null);
      return;
    }
    if (currency === "SGD") {
      setRate(1);
      return;
    }
    setRate(null);
    setFetching(true);
    fetch(
      `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${currency.toLowerCase()}.json`,
    )
      .then((r) => r.json())
      .then((data: Record<string, Record<string, number>>) => {
        const r = data[currency.toLowerCase()]?.["sgd"];
        setRate(r ? Math.round(r * 10000) / 10000 : null);
      })
      .catch(() => setRate(null))
      .finally(() => setFetching(false));
  }, [currency, baseCurrency]);

  const effectiveRate = currency === baseCurrency ? baseRate : currency === "SGD" ? 1 : (rate ?? 0);
  return { fetchedRate: rate, fetching, effectiveRate };
}

function Home({
  state,
  update,
  onSplitExpense,
}: {
  state: State;
  update: Upd;
  onSplitExpense: (e: Expense) => void;
}) {
  const st = stats(state);
  const pct =
    state.budgetSgd > 0 ? Math.min(100, Math.max(0, (st.spent / state.budgetSgd) * 100)) : 0;
  const over = st.todayLeft < 0;
  const recent = state.expenses.slice(0, 8);
  const [editing, setEditing] = useState<Expense | null>(null);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <section className="glass relative overflow-hidden p-7">
        <div className="absolute -right-20 -top-20 size-56 rotate-12 rounded-3xl bg-primary/20 blur-2xl" />
        <p className="label-caps relative">don't spend more than</p>
        <div className="relative mt-3 font-mono text-6xl font-bold tabular-nums">
          <span className="tracking-tighter">S${fmt(Math.max(0, st.perDay), 0)}</span>
          <span className="ml-1.5 text-2xl font-normal tracking-wide text-muted-foreground">
            /day
          </span>
        </div>
        <p className="relative mt-2 text-sm text-muted-foreground">
          {st.daysLeft} days left · S${fmt(st.perWeek, 0)}/week
          {st.burnoutDate && (
            <span className="text-accent">
              {" "}
              · going broke by{" "}
              {st.burnoutDate.toLocaleDateString("en-SG", {
                day: "numeric",
                month: "short",
              })}
            </span>
          )}
        </p>
        <div className="relative mt-6 h-2 rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${over || st.left < 0 ? "bg-accent" : "bg-gradient-to-r from-primary to-accent"}`}
            style={{ width: `${pct}%` }}
          />
          {[25, 50, 75].map((m) => (
            <div
              key={m}
              className="absolute inset-y-0 w-px bg-background/60"
              style={{ left: `${m}%` }}
            />
          ))}
        </div>
        <div className="relative mt-3 flex justify-between font-mono text-xs text-muted-foreground">
          <span>
            S${fmt(st.spent, 0)} of {fmt(state.budgetSgd, 0)}
          </span>
          <span className={over ? "text-accent" : "text-primary"}>
            {over ? `S$${fmt(-st.todayLeft)} over today` : `S$${fmt(st.todayLeft)} left today`}
          </span>
        </div>
      </section>

      <div className="glass grid grid-cols-3 divide-x overflow-hidden">
        <div className="p-4">
          <p className="label-caps">cash left</p>
          <p className={`mt-1 font-mono text-lg font-bold ${st.cashLeft < 0 ? "text-accent" : ""}`}>
            {state.currency} {fmt(st.cashLeft, 0)}
          </p>
        </div>
        <div className={`p-4 ${st.owedToMe > 0 ? "bg-primary/5" : ""}`}>
          <p className="label-caps">owed to you</p>
          <p
            className={`mt-1 font-mono text-lg font-bold ${st.owedToMe > 0 ? "text-primary" : "text-muted-foreground"}`}
          >
            S${fmt(st.owedToMe, 0)}
          </p>
        </div>
        <div className={`p-4 ${st.iOwe > 0 ? "bg-accent/5" : ""}`}>
          <p className="label-caps">you owe</p>
          <p
            className={`mt-1 font-mono text-lg font-bold ${st.iOwe > 0 ? "text-accent" : "text-muted-foreground"}`}
          >
            S${fmt(st.iOwe, 0)}
          </p>
        </div>
      </div>

      <section className="pt-1">
        <p className="label-caps mb-3">recent</p>
        {recent.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            nothing here yet. pretending it didn't happen?
          </p>
        )}
        <div className="space-y-px">
          {recent.map((e) => (
            <SwipeRow
              key={e.id}
              onDelete={() =>
                update((s) => ({ ...s, expenses: s.expenses.filter((x) => x.id !== e.id) }))
              }
            >
              <div
                className="flex cursor-pointer items-center gap-3 bg-background px-1 py-3"
                onClick={() => setEditing(e)}
              >
                <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted">
                  {CAT_EMOJI[e.category]}
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-sm font-medium">{e.note || e.category}</p>
                  <p className="lowercase text-xs text-muted-foreground">
                    {e.method} · {e.trip} ·{" "}
                    {new Date(e.date).toLocaleDateString("en-SG", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
                <div className="text-right leading-tight">
                  <p className="font-mono text-sm font-semibold">
                    {e.currency} {fmt(e.amount)}
                  </p>
                  <p className="font-mono text-xs text-primary">S${fmt(sgd(e))}</p>
                </div>
              </div>
            </SwipeRow>
          ))}
        </div>
      </section>

      {editing && (
        <EditExpense
          expense={editing}
          state={state}
          update={update}
          onClose={() => setEditing(null)}
          onSplit={(e) => {
            setEditing(null);
            onSplitExpense(e);
          }}
        />
      )}
    </div>
  );
}

function QuickAdd({ state, update, onClose }: { state: State; update: Upd; onClose: () => void }) {
  const [amt, setAmt] = useState("");
  const [note, setNote] = useState("");
  const [method, setMethod] = useState<"card" | "cash">("card");
  const [currency, setCurrency] = useState(state.currency);
  const {
    fetchedRate,
    fetching: fetchingRate,
    effectiveRate,
  } = useCurrencyRate(currency, state.currency, state.rate);
  const n = parseFloat(amt) || 0;

  const press = (k: string) => {
    if (k === "⌫") return setAmt((a) => a.slice(0, -1));
    if (k === "." && amt.includes(".")) return;
    if ((amt.split(".")[1]?.length ?? 0) >= 2) return;
    setAmt((a) => a + k);
  };
  const save = (category: string) => {
    if (n <= 0) return;
    update((s) => ({
      ...s,
      expenses: [
        {
          id: uid(),
          amount: n,
          currency,
          rate: effectiveRate,
          category,
          note,
          method,
          trip: s.activeTrip,
          date: new Date().toISOString(),
        },
        ...s.expenses,
      ],
    }));
    onClose();
  };

  return (
    <Sheet onClose={onClose}>
      <div className="flex items-baseline justify-between">
        <CurrencySelect
          value={currency}
          onChange={setCurrency}
          className="rounded-lg border bg-muted px-2 py-1 font-mono text-sm text-muted-foreground outline-none focus:border-primary"
        />
        <span className="font-mono text-5xl font-bold tabular-nums">{amt || "0"}</span>
      </div>
      {currency !== state.currency && currency !== "SGD" ? (
        <div className="mt-1 flex items-center justify-between">
          <span className="font-mono text-xs text-muted-foreground">
            {fetchingRate
              ? "fetching rate..."
              : fetchedRate
                ? `1 ${currency} = ${fetchedRate} SGD`
                : "rate unavailable"}
          </span>
          <p className="font-mono text-sm text-primary">≈ S${fmt(n * effectiveRate)}</p>
        </div>
      ) : (
        <p className="mt-1 text-right font-mono text-sm text-primary">
          ≈ S${fmt(n * effectiveRate)}
        </p>
      )}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"].map((k) => (
          <button
            key={k}
            onClick={() => press(k)}
            className="h-12 rounded-xl bg-muted font-mono text-lg active:bg-secondary"
          >
            {k}
          </button>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="spending on what again?"
          className="min-w-0 flex-1 rounded-xl border bg-muted px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
        <div className="flex rounded-xl border bg-muted p-1 text-xs font-semibold">
          {(["card", "cash"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`rounded-lg px-3 capitalize ${method === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <p className="label-caps mb-2 mt-4">what did you do</p>
      <div className="grid grid-cols-4 gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            disabled={n <= 0}
            onClick={() => save(c)}
            className="flex flex-col items-center gap-1 rounded-xl border bg-muted py-2.5 text-xs transition active:scale-95 enabled:hover:border-primary disabled:opacity-40"
          >
            <span className="text-lg">{CAT_EMOJI[c]}</span>
            {c}
          </button>
        ))}
      </div>
    </Sheet>
  );
}

function EditExpense({
  expense,
  state,
  update,
  onClose,
  onSplit,
}: {
  expense: Expense;
  state: State;
  update: Upd;
  onClose: () => void;
  onSplit?: (e: Expense) => void;
}) {
  const [amt, setAmt] = useState(String(expense.amount));
  const [currency, setCurrency] = useState(expense.currency);
  const [note, setNote] = useState(expense.note);
  const [method, setMethod] = useState<"card" | "cash">(expense.method);
  const [category, setCategory] = useState(expense.category);
  const [trip, setTrip] = useState(expense.trip);
  const [date, setDate] = useState(expense.date.slice(0, 10));
  const {
    fetchedRate,
    fetching: fetchingRate,
    effectiveRate,
  } = useCurrencyRate(currency, state.currency, state.rate);

  const save = () => {
    const n = parseFloat(amt);
    if (!n) return;
    update((s) => ({
      ...s,
      expenses: s.expenses.map((e) =>
        e.id === expense.id
          ? {
              ...e,
              amount: n,
              currency,
              rate: effectiveRate,
              note,
              method,
              category,
              trip,
              date: date ? new Date(date).toISOString() : e.date,
            }
          : e,
      ),
    }));
    onClose();
  };

  const del = () => {
    update((s) => ({ ...s, expenses: s.expenses.filter((e) => e.id !== expense.id) }));
    onClose();
  };

  return (
    <Sheet onClose={onClose}>
      <p className="label-caps mb-4">edit expense</p>
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input type="number" value={amt} onChange={setAmt} placeholder="Amount" />
          <CurrencySelect value={currency} onChange={setCurrency} />
        </div>
        {currency !== state.currency && (
          <RateHint fetching={fetchingRate} rate={fetchedRate} currency={currency} />
        )}
        <p className="text-right font-mono text-sm text-primary">
          ≈ S${fmt((parseFloat(amt) || 0) * effectiveRate)}
        </p>
        <Input value={note} onChange={setNote} placeholder="Note" />
        <div className="flex gap-2">
          <div className="flex flex-1 rounded-xl border bg-muted p-1 text-xs font-semibold">
            {(["card", "cash"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`flex-1 rounded-lg py-2 capitalize ${method === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                {m}
              </button>
            ))}
          </div>
          <select
            value={trip}
            onChange={(e) => setTrip(e.target.value)}
            className="flex-1 rounded-xl border bg-muted px-3 text-sm outline-none focus:border-primary"
          >
            {state.trips.map((t) => (
              <option key={t} className="bg-background">
                {t}
              </option>
            ))}
          </select>
        </div>
        <Input type="date" value={date} onChange={setDate} className="px-2 py-2 text-xs" />
        <div className="grid grid-cols-4 gap-2 pt-1">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 text-xs transition ${category === c ? "border-primary bg-primary/10 text-primary" : "bg-muted"}`}
            >
              <span className="text-lg">{CAT_EMOJI[c]}</span>
              {c}
            </button>
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={del}
            className="rounded-xl border border-accent/50 px-4 py-3 text-sm font-semibold text-accent"
          >
            Delete
          </button>
          {onSplit && (
            <button
              onClick={() => onSplit(expense)}
              className="rounded-xl border border-primary/50 px-4 py-3 text-sm font-semibold text-primary"
            >
              Split
            </button>
          )}
          <button
            onClick={save}
            className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground"
          >
            Save
          </button>
        </div>
      </div>
    </Sheet>
  );
}

type GroupExpenseRecord = {
  id: string;
  paidBy: string;
  total: number;
  totalSGD: number;
  currency: string;
  note: string;
  splitMode: "equal" | "unequal";
  participants: string[];
  shares: Record<string, number>;
};

type SavedGroup = {
  id: string;
  name: string;
  members: string[];
  expenses: GroupExpenseRecord[];
  addedToSplits: boolean;
};

function levenshtein(a: string, b: string): number {
  const m = a.length,
    n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i]![j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1]![j - 1]!
          : 1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!);
  return dp[m]![n]!;
}

function getSharesSGD(exp: GroupExpenseRecord): Record<string, number> {
  if (exp.splitMode === "equal") {
    const n = exp.participants.length;
    if (n === 0) return {};
    const base = Math.floor((exp.totalSGD / n) * 100) / 100;
    const rem = Math.round((exp.totalSGD - base * n) * 100) / 100;
    const result: Record<string, number> = {};
    exp.participants.forEach((p, i) => {
      result[p] = i === 0 ? base + rem : base;
    });
    return result;
  } else {
    const keys = Object.keys(exp.shares).filter((k) => (exp.shares[k] ?? 0) > 0);
    const totalOrig = keys.reduce((a, k) => a + (exp.shares[k] ?? 0), 0);
    if (totalOrig <= 0) return {};
    const result: Record<string, number> = {};
    let sumSGD = 0;
    keys.forEach((k) => {
      const s = Math.round(((exp.shares[k] ?? 0) / totalOrig) * exp.totalSGD * 100) / 100;
      result[k] = s;
      sumSGD += s;
    });
    const rem = Math.round((exp.totalSGD - sumSGD) * 100) / 100;
    if (keys.length > 0) {
      const fk = keys[0]!;
      result[fk] = Math.round(((result[fk] ?? 0) + rem) * 100) / 100;
    }
    return result;
  }
}

function computeNets(
  activeMembers: string[],
  expenses: GroupExpenseRecord[],
): Record<string, number> {
  const nets: Record<string, number> = {};
  activeMembers.forEach((m) => {
    nets[m] = 0;
  });
  expenses.forEach((exp) => {
    const shares = getSharesSGD(exp);
    activeMembers.forEach((m) => {
      const paid = exp.paidBy === m ? exp.totalSGD : 0;
      nets[m] = Math.round(((nets[m] ?? 0) + paid - (shares[m] ?? 0)) * 100) / 100;
    });
  });
  return nets;
}

function runningBalances(
  entries: LedgerEntry[],
): Array<{ entry: LedgerEntry; balanceAfter: number }> {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  let running = 0;
  return sorted.map((entry) => {
    const sign = entry.direction === "owed_to_me" ? 1 : -1;
    running = Math.round((running + sign * entry.amountSGD) * 100) / 100;
    return { entry, balanceAfter: running };
  });
}

function EditLedgerEntry({
  entry,
  state,
  update,
  onClose,
  onDelete,
}: {
  entry: LedgerEntry;
  state: State;
  update: Upd;
  onClose: () => void;
  onDelete: () => void;
}) {
  const [amt, setAmt] = useState(String(entry.originalAmount));
  const [currency, setCurrency] = useState(entry.currency);
  const [note, setNote] = useState(entry.note);
  const [direction, setDirection] = useState<"owed_to_me" | "i_owe">(entry.direction);
  const {
    fetchedRate,
    fetching: fetchingRate,
    effectiveRate,
  } = useCurrencyRate(currency, state.currency, state.rate);

  const save = () => {
    const a = parseFloat(amt);
    if (!a || a <= 0) return;
    const amountSGD = Math.round(a * effectiveRate * 100) / 100;
    update((s) => ({
      ...s,
      ledger: s.ledger.map((e) =>
        e.id === entry.id
          ? { ...e, note, direction, originalAmount: a, currency, rate: effectiveRate, amountSGD }
          : e,
      ),
    }));
    onClose();
  };

  return (
    <Sheet onClose={onClose} z="z-50">
      <p className="label-caps mb-4">edit {entry.type}</p>
      <div className="space-y-3">
        <div className="flex rounded-xl border p-1 text-xs font-semibold">
          {(["owed_to_me", "i_owe"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDirection(d)}
              className={`flex-1 rounded-lg py-2 transition ${
                direction === d
                  ? d === "owed_to_me"
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {d === "owed_to_me" ? "they owe me" : "i owe"}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input type="number" value={amt} onChange={setAmt} placeholder="Amount" />
          <CurrencySelect value={currency} onChange={setCurrency} />
        </div>
        <RateHint fetching={fetchingRate} rate={fetchedRate} currency={currency} />
        <p className="text-right font-mono text-sm text-primary">
          ≈ S${fmt((parseFloat(amt) || 0) * effectiveRate)}
        </p>
        <Input value={note} onChange={setNote} placeholder="For what?" />
        <div className="flex gap-2 pt-1">
          <button
            onClick={onDelete}
            className="rounded-xl border border-accent/50 px-4 py-3 text-sm font-semibold text-accent"
          >
            Delete
          </button>
          <button
            onClick={save}
            className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground"
          >
            Save
          </button>
        </div>
      </div>
    </Sheet>
  );
}

function PersonLedgerModal({
  personKey,
  state,
  update,
  onClose,
}: {
  personKey: string;
  state: State;
  update: Upd;
  onClose: () => void;
}) {
  const allNames = personNames(state.ledger);
  const displayName = allNames[personKey] ?? personKey;
  const bals = personBalances(state.ledger);
  const balance = bals[personKey] ?? 0;

  const entries = state.ledger.filter((e) => e.person.trim().toLowerCase() === personKey);
  const withBals = runningBalances(entries).reverse();

  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);
  const [deletePending, setDeletePending] = useState<LedgerEntry | null>(null);
  const deleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [settleAmt, setSettleAmt] = useState(Math.abs(balance).toFixed(2));
  const [settleConfirm, setSettleConfirm] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(displayName);

  useEffect(() => {
    setSettleAmt(Math.abs(balance).toFixed(2));
  }, [balance]);

  useEffect(
    () => () => {
      if (deleteTimer.current) clearTimeout(deleteTimer.current);
    },
    [],
  );

  const requestDelete = (entry: LedgerEntry) => {
    if (deleteTimer.current) clearTimeout(deleteTimer.current);
    setDeletePending(entry);
    deleteTimer.current = setTimeout(() => {
      update((s) => ({ ...s, ledger: s.ledger.filter((e) => e.id !== entry.id) }));
      setDeletePending(null);
    }, 5000);
  };

  const undoDelete = () => {
    if (deleteTimer.current) clearTimeout(deleteTimer.current);
    setDeletePending(null);
  };

  const settleAmtNum = parseFloat(settleAmt) || 0;
  const newBalAfterSettle =
    balance > 0
      ? Math.round((balance - settleAmtNum) * 100) / 100
      : Math.round((balance + settleAmtNum) * 100) / 100;
  const willFlip =
    (balance > 0 && newBalAfterSettle < -0.005) || (balance < 0 && newBalAfterSettle > 0.005);

  const doSettle = () => {
    if (!settleAmtNum || settleAmtNum <= 0) return;
    if (willFlip && !settleConfirm) {
      setSettleConfirm(true);
      return;
    }
    const dir: "owed_to_me" | "i_owe" = balance > 0 ? "i_owe" : "owed_to_me";
    update((s) => ({
      ...s,
      ledger: [
        {
          id: uid(),
          person: displayName,
          type: "payment",
          direction: dir,
          amountSGD: Math.round(settleAmtNum * 100) / 100,
          originalAmount: Math.round(settleAmtNum * 100) / 100,
          currency: "SGD",
          rate: 1,
          note: "settle up",
          date: new Date().toISOString(),
        },
        ...s.ledger,
      ],
    }));
    setSettleConfirm(false);
    setSettleAmt("0.00");
  };

  const doRename = () => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed.toLowerCase() === personKey) {
      setEditingName(false);
      return;
    }
    const existingKey = trimmed.toLowerCase();
    const willMerge = existingKey in allNames && existingKey !== personKey;
    const applyRename = () => {
      update((s) => ({
        ...s,
        ledger: s.ledger.map((e) =>
          e.person.trim().toLowerCase() === personKey ? { ...e, person: trimmed } : e,
        ),
      }));
      onClose();
    };
    if (willMerge) {
      if (
        window.confirm(
          `Merge "${displayName}" with existing "${allNames[existingKey]}"? All entries will be combined.`,
        )
      ) {
        applyRename();
      } else {
        setEditingName(false);
      }
    } else {
      applyRename();
    }
  };

  const share = async () => {
    const bills = entries.filter((e) => e.type === "bill");
    const list = bills.map((e) => `  · ${e.note || "bill"}: S$${fmt(e.amountSGD)}`).join("\n");
    const msg =
      balance > 0
        ? `hey ${displayName}!! jccash bot official notice: u owe me S$${fmt(balance)} total.\n${list}\nno pressure but also... pay me pls`
        : `hey ${displayName}!! jccash confessional — i owe u S$${fmt(Math.abs(balance))} total.\n${list}\nit's coming i promise`;
    if (navigator.share) await navigator.share({ text: msg }).catch(() => {});
    else await navigator.clipboard.writeText(msg).catch(() => {});
  };

  const visibleWithBals = withBals.filter(({ entry }) => entry.id !== deletePending?.id);

  return (
    <>
      <Sheet
        onClose={onClose}
        className="p-5 pb-10"
        style={{ maxHeight: "85dvh", overflowY: "auto" }}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {editingName ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") doRename();
                    if (e.key === "Escape") setEditingName(false);
                  }}
                  className="min-w-0 flex-1 rounded-xl border bg-muted px-3 py-2 text-sm font-semibold outline-none focus:border-primary"
                />
                <button
                  onClick={doRename}
                  className="rounded-xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground"
                >
                  OK
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className="rounded-xl border px-3 py-2 text-sm text-muted-foreground"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setNewName(displayName);
                  setEditingName(true);
                }}
                className="text-left"
              >
                <p className="text-base font-bold">{displayName}</p>
                <p className="text-xs text-muted-foreground">tap to rename</p>
              </button>
            )}
          </div>
          <div
            className={`shrink-0 rounded-xl px-3 py-1.5 font-mono text-sm font-bold ${
              balance > 0.005
                ? "bg-primary/10 text-primary"
                : balance < -0.005
                  ? "bg-accent/10 text-accent"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {balance > 0.005
              ? `owes me S$${fmt(balance)}`
              : balance < -0.005
                ? `I owe S$${fmt(Math.abs(balance))}`
                : "settled"}
          </div>
        </div>

        {Math.abs(balance) > 0.005 && (
          <div className="mb-4 space-y-3 rounded-xl border p-4">
            <p className="label-caps">settle up · SGD only</p>
            {settleConfirm ? (
              <div className="space-y-2">
                <p className="text-sm text-accent">
                  {balance > 0
                    ? `This overpays — ${displayName}'s balance flips. You'll owe them S$${fmt(Math.abs(newBalAfterSettle))}.`
                    : `This overpays — ${displayName} will owe you S$${fmt(Math.abs(newBalAfterSettle))}.`}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSettleConfirm(false)}
                    className="flex-1 rounded-xl border py-2.5 text-sm text-muted-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={doSettle}
                    className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={settleAmt}
                  onChange={(v) => {
                    setSettleAmt(v);
                    setSettleConfirm(false);
                  }}
                  placeholder="Amount"
                />
                <button
                  onClick={doSettle}
                  className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
                >
                  Settle
                </button>
              </div>
            )}
          </div>
        )}

        {deletePending && (
          <div className="mb-3 flex items-center gap-3 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3">
            <span className="flex-1 text-sm text-accent">
              "{deletePending.note || deletePending.type}" deleted
            </span>
            <button onClick={undoDelete} className="text-sm font-semibold text-primary">
              Undo
            </button>
          </div>
        )}

        <div className="space-y-2">
          {visibleWithBals.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">no entries yet.</p>
          ) : (
            visibleWithBals.map(({ entry, balanceAfter }) => (
              <div key={entry.id} className="rounded-xl border bg-card p-3">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                        entry.type === "payment"
                          ? "bg-muted text-muted-foreground"
                          : entry.direction === "owed_to_me"
                            ? "bg-primary/10 text-primary"
                            : "bg-accent/10 text-accent"
                      }`}
                    >
                      {entry.type === "payment"
                        ? "payment"
                        : entry.direction === "owed_to_me"
                          ? "they owe"
                          : "I owe"}
                    </span>
                    <p className="mt-1 truncate text-sm font-medium">
                      {entry.note || (entry.type === "payment" ? "settle up" : "bill")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.date).toLocaleDateString("en-SG", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {entry.currency !== "SGD" &&
                        ` · ${entry.currency} ${fmt(entry.originalAmount)}`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={`font-mono text-sm font-bold ${entry.direction === "owed_to_me" ? "text-primary" : "text-accent"}`}
                    >
                      {entry.direction === "owed_to_me" ? "+" : "-"}S${fmt(entry.amountSGD)}
                    </p>
                    <p
                      className={`font-mono text-xs ${
                        balanceAfter > 0.005
                          ? "text-primary"
                          : balanceAfter < -0.005
                            ? "text-accent"
                            : "text-muted-foreground"
                      }`}
                    >
                      bal: {balanceAfter > 0 ? "+" : ""}S${fmt(balanceAfter)}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex justify-end gap-3">
                  <button
                    onClick={() => setEditingEntry(entry)}
                    className="text-xs text-muted-foreground hover:text-primary"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => requestDelete(entry)}
                    className="text-xs text-muted-foreground hover:text-accent"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 flex gap-2">
          {entries.length > 0 && (
            <button
              onClick={share}
              className="flex-1 rounded-xl border py-3 text-sm font-semibold text-muted-foreground"
            >
              Share
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border py-3 text-sm font-semibold text-muted-foreground"
          >
            Close
          </button>
        </div>
      </Sheet>

      {editingEntry && (
        <EditLedgerEntry
          entry={editingEntry}
          state={state}
          update={update}
          onClose={() => setEditingEntry(null)}
          onDelete={() => {
            requestDelete(editingEntry);
            setEditingEntry(null);
          }}
        />
      )}
    </>
  );
}

const CHART = [
  "var(--primary)",
  "var(--accent)",
  "oklch(0.6 0.15 150)",
  "oklch(0.75 0.15 30)",
  "oklch(0.45 0.12 150)",
  "oklch(0.65 0.18 260)",
  "oklch(0.7 0.15 80)",
  "oklch(0.55 0.2 320)",
  "oklch(0.5 0.18 20)",
  "oklch(0.7 0 0)",
];

function Stats({
  state,
  update,
  onSplitExpense,
}: {
  state: State;
  update: Upd;
  onSplitExpense: (e: Expense) => void;
}) {
  const [trip, setTrip] = useState("All");
  const [period, setPeriod] = useState("all");
  const [view, setView] = useState<"breakdown" | "recap" | "log">("breakdown");
  const [search, setSearch] = useState("");
  const [editingLog, setEditingLog] = useState<Expense | null>(null);

  const months = [...new Set(state.expenses.map((e) => e.date.slice(0, 7)))].sort((a, b) =>
    b.localeCompare(a),
  );
  const fmtMonth = (m: string) =>
    new Date(m + "-02").toLocaleDateString("en-SG", { month: "short", year: "numeric" });

  const list = state.expenses.filter((e) => {
    if (trip !== "All" && e.trip !== trip) return false;
    if (period !== "all" && e.date.slice(0, 7) !== period) return false;
    return true;
  });
  const total = list.reduce((a, e) => a + sgd(e), 0);
  const rows = CATEGORIES.map((c, i) => ({
    c,
    color: CHART[i],
    v: list.filter((e) => e.category === c).reduce((a, e) => a + sgd(e), 0),
  }))
    .filter((r) => r.v > 0)
    .sort((a, b) => b.v - a.v);
  let acc = 0;
  const grad = rows
    .map((r) => {
      const s = acc;
      acc += (r.v / total) * 100;
      return `${r.color} ${s}% ${acc}%`;
    })
    .join(",");
  const cash = list.filter((e) => e.method === "cash").reduce((a, e) => a + sgd(e), 0);

  const biggest = list.length > 0 ? list.reduce((a, e) => (sgd(e) > sgd(a) ? e : a)) : null;
  const byDay: Record<string, number> = {};
  list.forEach((e) => {
    const d = e.date.slice(0, 10);
    byDay[d] = (byDay[d] ?? 0) + sgd(e);
  });
  const dayEntries = Object.entries(byDay).sort((a, b) => b[1] - a[1]);
  const activeDays = dayEntries.length;
  const avgPerActiveDay = activeDays > 0 ? total / activeDays : 0;

  const tripTotals = state.trips
    .map((t) => ({ t, v: list.filter((e) => e.trip === t).reduce((a, e) => a + sgd(e), 0) }))
    .filter((r) => r.v > 0)
    .sort((a, b) => b.v - a.v);

  const allMonths = [...new Set(state.expenses.map((e) => e.date.slice(0, 7)))].sort();
  const monthlyTotals = allMonths
    .map((m) => ({
      m,
      v: list.filter((e) => e.date.slice(0, 7) === m).reduce((a, e) => a + sgd(e), 0),
    }))
    .filter((x) => x.v > 0);
  const maxMonthly = Math.max(...monthlyTotals.map((x) => x.v), 1);

  const q = search.toLowerCase();
  const logList = list
    .filter(
      (e) =>
        !q ||
        e.note.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.trip.toLowerCase().includes(q),
    )
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex rounded-full border p-1 text-xs font-semibold">
        {(["breakdown", "recap", "log"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 rounded-full py-1.5 uppercase tracking-widest transition ${view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            {v}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <select
          value={trip}
          onChange={(e) => setTrip(e.target.value)}
          className="flex-1 rounded-full border bg-muted px-3 py-2 text-xs text-muted-foreground outline-none focus:border-primary"
        >
          {["All", ...state.trips].map((t) => (
            <option key={t} className="bg-background">
              {t}
            </option>
          ))}
        </select>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="flex-1 rounded-full border bg-muted px-3 py-2 text-xs text-muted-foreground outline-none focus:border-primary"
        >
          <option value="all" className="bg-background">
            All time
          </option>
          {months.map((m) => (
            <option key={m} value={m} className="bg-background">
              {fmtMonth(m)}
            </option>
          ))}
        </select>
      </div>

      {view === "breakdown" && (
        <>
          <section className="glass p-6">
            <p className="label-caps">where it's going</p>
            {total === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                either you haven't spent anything, or you're in denial.
              </p>
            ) : (
              <>
                <div
                  className="relative mx-auto my-6 size-44 rounded-full"
                  style={{ background: `conic-gradient(${grad})` }}
                >
                  <div className="absolute inset-5 grid place-items-center rounded-full bg-background text-center">
                    <div>
                      <p className="font-mono text-2xl font-bold">S${fmt(total, 0)}</p>
                      <p className="text-xs text-muted-foreground">total</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  {rows.map((r) => (
                    <div key={r.c} className="flex items-center gap-3 text-sm">
                      <span className="size-2.5 rounded-full" style={{ background: r.color }} />
                      <span className="flex-1">{r.c}</span>
                      <span className="font-mono text-muted-foreground">
                        S${fmt(r.v, 0)} · {Math.round((r.v / total) * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          {period === "all" && monthlyTotals.length >= 2 && (
            <section className="pt-2">
              <p className="label-caps mb-4">by month</p>
              <div className="space-y-2">
                {monthlyTotals.map(({ m, v }) => (
                  <div key={m} className="relative overflow-hidden rounded-lg">
                    <div
                      className="absolute inset-y-0 left-0 rounded-lg bg-primary/15"
                      style={{ width: `${(v / maxMonthly) * 100}%` }}
                    />
                    <div className="relative flex items-center justify-between px-3 py-2.5 text-sm">
                      <span className="text-muted-foreground">{fmtMonth(m)}</span>
                      <span className="font-mono font-semibold">S${fmt(v, 0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {tripTotals.length > 1 && (
            <section className="pt-2">
              <p className="label-caps mb-4">by trip</p>
              <div className="space-y-2">
                {tripTotals.map(({ t, v }) => (
                  <div key={t} className="relative overflow-hidden rounded-lg">
                    <div
                      className="absolute inset-y-0 left-0 rounded-lg bg-primary/10"
                      style={{ width: `${(v / (tripTotals[0]?.v ?? 1)) * 100}%` }}
                    />
                    <div className="relative flex items-center justify-between px-3 py-2.5 text-sm">
                      <span>{t}</span>
                      <span className="font-mono text-muted-foreground">S${fmt(v, 0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <p className="label-caps">card</p>
              <p className="mt-1 font-mono text-lg font-bold">S${fmt(total - cash, 0)}</p>
            </div>
            <div>
              <p className="label-caps">cash</p>
              <p className="mt-1 font-mono text-lg font-bold">S${fmt(cash, 0)}</p>
            </div>
          </section>
        </>
      )}

      {view === "recap" && (
        <div className="space-y-3">
          {total === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              no data. good for you, or concerning, hard to say.
            </p>
          ) : (
            <>
              <section className="glass p-8 text-center" style={{ borderColor: "var(--accent)" }}>
                <p className="label-caps mb-4 text-accent">biggest splurge</p>
                {biggest ? (
                  <>
                    <p className="font-mono text-5xl font-bold text-accent">
                      S${fmt(sgd(biggest), 0)}
                    </p>
                    <p className="mt-3 text-sm text-foreground/80">
                      {biggest.note || biggest.category}
                    </p>
                    <p className="mt-1 label-caps text-muted-foreground">
                      {new Date(biggest.date).toLocaleDateString("en-SG", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground">—</p>
                )}
              </section>

              {dayEntries.length > 0 && (
                <section className="glass p-5" style={{ borderColor: "oklch(0.65 0.18 260)" }}>
                  <p className="label-caps mb-4" style={{ color: "oklch(0.65 0.18 260)" }}>
                    wildest days
                  </p>
                  <div className="space-y-2">
                    {dayEntries.slice(0, 5).map(([day, v], i) => (
                      <div key={day} className="flex items-center gap-3 text-sm">
                        <span className="w-5 font-mono text-xs text-muted-foreground">
                          #{i + 1}
                        </span>
                        <span className="flex-1 text-muted-foreground">
                          {new Date(day + "T12:00:00").toLocaleDateString("en-SG", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                        <span
                          className="font-mono font-semibold"
                          style={i === 0 ? { color: "oklch(0.78 0.18 260)" } : undefined}
                        >
                          S${fmt(v, 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <div className="grid grid-cols-2 gap-3">
                <section
                  className="glass p-6 text-center"
                  style={{ borderColor: "var(--primary)" }}
                >
                  <p className="label-caps mb-3 text-primary">avg / day</p>
                  <p className="font-mono text-3xl font-bold text-primary">
                    S${fmt(avgPerActiveDay, 0)}
                  </p>
                  <p className="mt-1 label-caps text-muted-foreground">the daily damage</p>
                </section>
                <section
                  className="glass p-6 text-center"
                  style={{ borderColor: "oklch(0.75 0.18 80)" }}
                >
                  <p className="label-caps mb-3" style={{ color: "oklch(0.75 0.18 80)" }}>
                    days out
                  </p>
                  <p
                    className="font-mono text-3xl font-bold"
                    style={{ color: "oklch(0.82 0.18 80)" }}
                  >
                    {activeDays}
                  </p>
                  <p className="mt-1 label-caps text-muted-foreground">poor choices</p>
                </section>
              </div>
            </>
          )}
        </div>
      )}

      {view === "log" && (
        <div className="space-y-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="search notes, categories, trips..."
            className="w-full rounded-xl border bg-muted px-4 py-3 text-sm outline-none focus:border-primary"
          />
          {logList.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {search ? "nothing matches. try something else." : "no expenses yet."}
            </p>
          ) : (
            <div className="space-y-px">
              {logList.map((e) => (
                <SwipeRow
                  key={e.id}
                  onDelete={() =>
                    update((s) => ({
                      ...s,
                      expenses: s.expenses.filter((x) => x.id !== e.id),
                    }))
                  }
                >
                  <div
                    className="flex cursor-pointer items-center gap-3 bg-background px-1 py-3"
                    onClick={() => setEditingLog(e)}
                  >
                    <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted">
                      {CAT_EMOJI[e.category]}
                    </div>
                      <div className="min-w-0 flex-1 leading-tight">
                        <p className="truncate text-sm font-medium">{e.note || e.category}</p>
                        <p className="lowercase text-xs text-muted-foreground">
                          {e.method} · {e.trip} ·{" "}
                          {new Date(e.date).toLocaleDateString("en-SG", {
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                      </div>
                      <div className="text-right leading-tight">
                        <p className="font-mono text-sm font-semibold">
                          {e.currency} {fmt(e.amount)}
                        </p>
                        <p className="font-mono text-xs text-primary">S${fmt(sgd(e))}</p>
                      </div>
                    </div>
                </SwipeRow>
              ))}
            </div>
          )}
        </div>
      )}

      {editingLog && (
        <EditExpense
          expense={editingLog}
          state={state}
          update={update}
          onClose={() => setEditingLog(null)}
          onSplit={(e) => {
            setEditingLog(null);
            onSplitExpense(e);
          }}
        />
      )}
    </div>
  );
}

function SplitView({
  state,
  update,
  preFillExpense,
}: {
  state: State;
  update: Upd;
  preFillExpense?: Expense | null;
}) {
  const [mode, setMode] = useState<"individual" | "group">("individual");
  const [addDir, setAddDir] = useState<"owed_to_me" | "i_owe">("owed_to_me");
  const [name, setName] = useState("");
  const [amt, setAmt] = useState("");
  const [note, setNote] = useState("");
  const [addCurrency, setAddCurrency] = useState(state.currency);
  const [activePerson, setActivePerson] = useState<string | null>(null);
  const [settledOpen, setSettledOpen] = useState(false);

  const {
    fetchedRate: addFetchedRate,
    fetching: fetchingAdd,
    effectiveRate: addEffectiveRate,
  } = useCurrencyRate(addCurrency, state.currency, state.rate);

  useEffect(() => {
    if (!preFillExpense) return;
    setMode("individual");
    setAddDir("owed_to_me");
    setAmt(String(Math.round(sgd(preFillExpense) * 100) / 100));
    setAddCurrency("SGD");
    setNote(preFillExpense.note || preFillExpense.category);
    setName("");
  }, [preFillExpense]);

  const bals = personBalances(state.ledger);
  const names = personNames(state.ledger);
  const existingNames = Object.values(names);

  const allActive = Object.keys(bals).filter((key) =>
    state.ledger.some((e) => e.person.trim().toLowerCase() === key),
  );
  const activePeople = allActive
    .filter((k) => Math.abs(bals[k] ?? 0) > 0.005)
    .sort((a, b) => Math.abs(bals[b] ?? 0) - Math.abs(bals[a] ?? 0));
  const settledPeople = allActive.filter((k) => Math.abs(bals[k] ?? 0) <= 0.005);

  const totalOwedToMe = activePeople
    .filter((k) => (bals[k] ?? 0) > 0)
    .reduce((a, k) => a + (bals[k] ?? 0), 0);
  const totalIOwe = activePeople
    .filter((k) => (bals[k] ?? 0) < 0)
    .reduce((a, k) => a + Math.abs(bals[k] ?? 0), 0);
  const net = Math.round((totalOwedToMe - totalIOwe) * 100) / 100;

  const add = () => {
    const a = parseFloat(amt);
    if (!name.trim() || !a || a <= 0) return;
    const personKey = name.trim().toLowerCase();
    const near = existingNames.find(
      (n) =>
        n.toLowerCase() !== personKey &&
        Math.min(n.length, name.trim().length) >= 5 &&
        levenshtein(n.toLowerCase(), personKey) <= 2,
    );
    const finalName =
      near && window.confirm(`"${name.trim()}" looks like "${near}". Use "${near}" instead?`)
        ? near
        : name.trim();
    const amountSGD = Math.round(a * addEffectiveRate * 100) / 100;
    update((s) => ({
      ...s,
      ledger: [
        {
          id: uid(),
          person: finalName,
          type: "bill",
          direction: addDir,
          amountSGD,
          originalAmount: a,
          currency: addCurrency,
          rate: addEffectiveRate,
          note,
          date: new Date().toISOString(),
        },
        ...s.ledger,
      ],
    }));
    setName("");
    setAmt("");
    setNote("");
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex rounded-full border p-1 text-xs font-semibold">
        {(["individual", "group"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded-full py-1.5 uppercase tracking-widest transition ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            {m}
          </button>
        ))}
      </div>

      {mode === "group" && <GroupSplitter state={state} update={update} />}

      {mode === "individual" && (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="label-caps">owed to me</p>
              <p
                className={`mt-1 font-mono text-xl font-bold ${totalOwedToMe > 0 ? "text-primary" : "text-muted-foreground"}`}
              >
                S${fmt(totalOwedToMe, 0)}
              </p>
            </div>
            <div>
              <p className="label-caps">i owe</p>
              <p
                className={`mt-1 font-mono text-xl font-bold ${totalIOwe > 0 ? "text-accent" : "text-muted-foreground"}`}
              >
                S${fmt(totalIOwe, 0)}
              </p>
            </div>
            <div>
              <p className="label-caps">net</p>
              <p
                className={`mt-1 font-mono text-xl font-bold ${net > 0 ? "text-primary" : net < 0 ? "text-accent" : "text-muted-foreground"}`}
              >
                {net >= 0 ? "+" : ""}S${fmt(Math.abs(net), 0)}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex rounded-xl border p-1 text-xs font-semibold">
              <button
                onClick={() => setAddDir("owed_to_me")}
                className={`flex-1 rounded-lg py-2.5 transition ${addDir === "owed_to_me" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                I paid, they owe
              </button>
              <button
                onClick={() => setAddDir("i_owe")}
                className={`flex-1 rounded-lg py-2.5 transition ${addDir === "i_owe" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
              >
                they paid, I owe
              </button>
            </div>
            <div className="relative">
              <input
                list="person-names"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={addDir === "owed_to_me" ? "Who owes you" : "Who you owe"}
                className="w-full rounded-xl border bg-muted px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
              <datalist id="person-names">
                {existingNames.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </div>
            <div className="flex gap-2">
              <Input value={amt} onChange={setAmt} placeholder="Amount" type="number" />
              <CurrencySelect
                value={addCurrency}
                onChange={setAddCurrency}
                className="rounded-xl border bg-muted px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <RateHint fetching={fetchingAdd} rate={addFetchedRate} currency={addCurrency} />
            <Input value={note} onChange={setNote} placeholder="For what?" />
            <button
              onClick={add}
              className="w-full rounded-xl bg-primary py-3 text-sm font-bold uppercase tracking-widest text-primary-foreground"
            >
              Add
            </button>
          </div>

          {allActive.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              no splits yet. add someone above.
            </p>
          ) : (
            <div className="space-y-2">
              {activePeople.map((key) => {
                const bal = bals[key] ?? 0;
                return (
                  <button
                    key={key}
                    onClick={() => setActivePerson(key)}
                    className="flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{names[key] ?? key}</p>
                    </div>
                    <span
                      className={`font-mono text-sm font-bold ${bal > 0 ? "text-primary" : "text-accent"}`}
                    >
                      {bal > 0 ? "owes " : "you owe "}S${fmt(Math.abs(bal))}
                    </span>
                    <span className="text-xs text-muted-foreground">›</span>
                  </button>
                );
              })}
            </div>
          )}

          {settledPeople.length > 0 && (
            <div className="border-t pt-3">
              <button
                onClick={() => setSettledOpen((o) => !o)}
                className="flex w-full items-center justify-between"
              >
                <p className="label-caps">settled ({settledPeople.length})</p>
                <span className="text-xs text-muted-foreground">{settledOpen ? "▲" : "▼"}</span>
              </button>
              {settledOpen && (
                <div className="mt-3 space-y-2">
                  {settledPeople.map((key) => (
                    <button
                      key={key}
                      onClick={() => setActivePerson(key)}
                      className="flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left opacity-60"
                    >
                      <span className="flex-1 text-sm">{names[key] ?? key}</span>
                      <span className="font-mono text-xs text-muted-foreground">settled</span>
                      <span className="text-xs text-muted-foreground">›</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {activePerson !== null && (
            <PersonLedgerModal
              personKey={activePerson}
              state={state}
              update={update}
              onClose={() => setActivePerson(null)}
            />
          )}
        </>
      )}
    </div>
  );
}

function GroupSplitter({ state, update }: { state: State; update: Upd }) {
  const [groups, setGroups] = useState<SavedGroup[]>([]);
  const [groupsLoaded, setGroupsLoaded] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SavedGroup | null>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [creatingNew, setCreatingNew] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("jccash-groups-v2");
      if (raw) {
        const parsed = JSON.parse(raw) as SavedGroup[];
        if (Array.isArray(parsed)) setGroups(parsed);
      } else {
        const oldRaw = localStorage.getItem("jccash-group-v1");
        if (oldRaw) {
          const { members: m, expenses: e } = JSON.parse(oldRaw) as {
            members: string[];
            expenses: GroupExpenseRecord[];
          };
          if (Array.isArray(m) && m.length > 1) {
            const mg: SavedGroup = {
              id: uid(),
              name: "Group",
              members: m,
              expenses: Array.isArray(e) ? e : [],
              addedToSplits: false,
            };
            setGroups([mg]);
            localStorage.removeItem("jccash-group-v1");
          }
        }
      }
    } catch {
      /* ignore */
    }
    setGroupsLoaded(true);
  }, []);

  useEffect(() => {
    if (!groupsLoaded) return;
    localStorage.setItem("jccash-groups-v2", JSON.stringify(groups));
  }, [groups, groupsLoaded]);

  const confirmCreateGroup = () => {
    const name = newGroupName.trim();
    if (!name) return;
    const g: SavedGroup = { id: uid(), name, members: ["You"], expenses: [], addedToSplits: false };
    setGroups((prev) => [...prev, g]);
    setSelectedGroupId(g.id);
    setCreatingNew(false);
    setNewGroupName("");
  };

  const deleteGroup = (g: SavedGroup) => {
    setGroups((prev) => prev.filter((x) => x.id !== g.id));
    if (selectedGroupId === g.id) setSelectedGroupId(null);
    setPendingDelete(g);
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    deleteTimerRef.current = setTimeout(() => setPendingDelete(null), 5000);
  };

  const undoDelete = () => {
    if (!pendingDelete) return;
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    setGroups((prev) => [...prev, pendingDelete]);
    setPendingDelete(null);
  };

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? null;

  return (
    <div className="space-y-4">
      {pendingDelete && (
        <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-2.5 text-sm">
          <span className="text-muted-foreground">"{pendingDelete.name}" deleted</span>
          <button onClick={undoDelete} className="font-semibold text-primary">
            Undo
          </button>
        </div>
      )}

      {selectedGroup ? (
        <GroupEditor
          group={selectedGroup}
          onUpdateGroup={(g) => setGroups((prev) => prev.map((x) => (x.id === g.id ? g : x)))}
          onBack={() => setSelectedGroupId(null)}
          onDelete={() => deleteGroup(selectedGroup)}
          state={state}
          update={update}
        />
      ) : (
        <>
          {groups.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">no groups yet</p>
          ) : (
            <div className="space-y-2">
              {groups.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center gap-3 rounded-xl border px-4 py-3"
                >
                  {renamingId === g.id ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => {
                        const v = renameValue.trim();
                        if (v)
                          setGroups((prev) =>
                            prev.map((x) => (x.id === g.id ? { ...x, name: v } : x)),
                          );
                        setRenamingId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      className="min-w-0 flex-1 rounded-lg border bg-muted px-2 py-1 text-sm outline-none focus:border-primary"
                    />
                  ) : (
                    <button
                      onClick={() => setSelectedGroupId(g.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-sm font-medium">{g.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {g.members.length} people · {g.expenses.length} expense
                        {g.expenses.length !== 1 ? "s" : ""}
                        {g.addedToSplits ? " · added to splits" : ""}
                      </p>
                    </button>
                  )}
                  {renamingId !== g.id && (
                    <>
                      <button
                        onClick={() => {
                          setRenamingId(g.id);
                          setRenameValue(g.name);
                        }}
                        className="shrink-0 text-xs text-muted-foreground hover:text-primary"
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => deleteGroup(g)}
                        className="shrink-0 text-xs text-muted-foreground hover:text-accent"
                      >
                        ✕
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          {creatingNew ? (
            <div className="flex gap-2">
              <input
                autoFocus
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmCreateGroup();
                  if (e.key === "Escape") {
                    setCreatingNew(false);
                    setNewGroupName("");
                  }
                }}
                placeholder="Group name"
                className="min-w-0 flex-1 rounded-xl border bg-muted px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
              <button
                onClick={confirmCreateGroup}
                disabled={!newGroupName.trim()}
                className="rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-40"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setCreatingNew(false);
                  setNewGroupName("");
                }}
                className="rounded-xl border px-3 text-sm text-muted-foreground"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCreatingNew(true)}
              className="w-full rounded-xl border border-primary py-2.5 text-sm font-semibold text-primary"
            >
              + New group
            </button>
          )}
        </>
      )}
    </div>
  );
}

function GroupEditor({
  group,
  onUpdateGroup,
  onBack,
  onDelete,
  state,
  update,
}: {
  group: SavedGroup;
  onUpdateGroup: (g: SavedGroup) => void;
  onBack: () => void;
  onDelete: () => void;
  state: State;
  update: Upd;
}) {
  const groupRef = useRef(group);
  groupRef.current = group;

  const [members, setMembers] = useState<string[]>(group.members);
  const [newMember, setNewMember] = useState("");
  const [expenses, setExpenses] = useState<GroupExpenseRecord[]>(group.expenses);
  const [summary, setSummary] = useState("");
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  const [expPaidBy, setExpPaidBy] = useState("You");
  const [expTotal, setExpTotal] = useState("");
  const [expCurrency, setExpCurrency] = useState(state.currency);
  const [expNote, setExpNote] = useState("");
  const [expSplitMode, setExpSplitMode] = useState<"equal" | "unequal">("equal");
  const [expParticipants, setExpParticipants] = useState<string[]>([]);
  const [expShares, setExpShares] = useState<Record<string, string>>({});
  const [splitOptionsOpen, setSplitOptionsOpen] = useState(false);
  const [addingExpense, setAddingExpense] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  const {
    fetchedRate: gFetchedRate,
    fetching: gFetching,
    effectiveRate: gEffectiveRate,
  } = useCurrencyRate(expCurrency, state.currency, state.rate);

  useEffect(() => {
    onUpdateGroup({ ...groupRef.current, members, expenses });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, expenses]);

  const activeMembers = members.filter((m) => m.trim());

  useEffect(() => {
    setExpParticipants(activeMembers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members.join(",")]);

  const expTotalNum = parseFloat(expTotal) || 0;
  const expTotalSGD = Math.round(expTotalNum * gEffectiveRate * 100) / 100;
  const sharesSum = activeMembers.reduce((a, m) => a + (parseFloat(expShares[m] ?? "") || 0), 0);
  const unassigned = Math.round((expTotalNum - sharesSum) * 100) / 100;

  const canAdd =
    expTotalNum > 0 &&
    (expSplitMode === "equal" ? expParticipants.length >= 2 : Math.abs(unassigned) < 0.005);

  const resetForm = () => {
    setEditingExpenseId(null);
    setExpTotal("");
    setExpNote("");
    setExpShares({});
    setExpSplitMode("equal");
    setExpParticipants(activeMembers);
    setSplitOptionsOpen(false);
  };

  const loadForEdit = (exp: GroupExpenseRecord) => {
    setEditingExpenseId(exp.id);
    setExpPaidBy(exp.paidBy);
    setExpTotal(String(exp.total));
    setExpCurrency(exp.currency);
    setExpNote(exp.note);
    setExpSplitMode(exp.splitMode);
    setExpParticipants(exp.participants);
    const sharesStr: Record<string, string> = {};
    Object.entries(exp.shares).forEach(([k, v]) => {
      sharesStr[k] = String(v);
    });
    setExpShares(sharesStr);
    setSplitOptionsOpen(true);
    setAddingExpense(true);
  };

  const submitExpense = () => {
    if (!canAdd) return;
    const sharesNum: Record<string, number> = {};
    if (expSplitMode === "unequal") {
      activeMembers.forEach((m) => {
        const v = parseFloat(expShares[m] ?? "") || 0;
        if (v > 0) sharesNum[m] = v;
      });
    }
    const newExp: GroupExpenseRecord = {
      id: editingExpenseId ?? uid(),
      paidBy: expPaidBy,
      total: expTotalNum,
      totalSGD: expTotalSGD,
      currency: expCurrency,
      note: expNote,
      splitMode: expSplitMode,
      participants:
        expSplitMode === "equal"
          ? expParticipants
          : activeMembers.filter((m) => (parseFloat(expShares[m] ?? "") || 0) > 0),
      shares: sharesNum,
    };
    if (editingExpenseId) {
      setExpenses((prev) => prev.map((e) => (e.id === editingExpenseId ? newExp : e)));
    } else {
      setExpenses((prev) => [...prev, newExp]);
    }
    onUpdateGroup({ ...groupRef.current, members, expenses, addedToSplits: false });
    resetForm();
  };

  const splitRestEqually = () => {
    if (unassigned <= 0.005) return;
    const emptyMembers = activeMembers.filter((m) => !(parseFloat(expShares[m] ?? "") > 0));
    if (emptyMembers.length === 0) return;
    const perPerson = Math.floor((unassigned / emptyMembers.length) * 100) / 100;
    const remainder = Math.round((unassigned - perPerson * emptyMembers.length) * 100) / 100;
    setExpShares((prev) => {
      const next = { ...prev };
      emptyMembers.forEach((m, i) => {
        next[m] = String(Math.round((perPerson + (i === 0 ? remainder : 0)) * 100) / 100);
      });
      return next;
    });
  };

  const nets = computeNets(activeMembers, expenses);

  const transfers: { from: string; to: string; amount: number }[] = [];
  {
    const creds = Object.entries(nets)
      .filter(([, v]) => v > 0.005)
      .map(([n, a]) => ({ n, a }))
      .sort((a, b) => b.a - a.a);
    const debts = Object.entries(nets)
      .filter(([, v]) => v < -0.005)
      .map(([n, a]) => ({ n, a: -a }))
      .sort((a, b) => b.a - a.a);
    let ci = 0,
      di = 0;
    while (ci < creds.length && di < debts.length) {
      const cr = creds[ci]!,
        de = debts[di]!;
      const t = Math.min(cr.a, de.a);
      if (t > 0.005) transfers.push({ from: de.n, to: cr.n, amount: Math.round(t * 100) / 100 });
      cr.a -= t;
      de.a -= t;
      if (cr.a < 0.005) ci++;
      if (de.a < 0.005) di++;
    }
  }

  const createGroupSplits = () => {
    const myLegs = transfers.filter((t) => t.from === "You" || t.to === "You");
    if (myLegs.length === 0) return;
    const expNotes =
      expenses
        .map((e) => e.note)
        .filter(Boolean)
        .join(", ") || "group bill";
    const myBills: LedgerEntry[] = myLegs.map((t) => ({
      id: uid(),
      person: t.from === "You" ? t.to : t.from,
      type: "bill" as const,
      direction: (t.from === "You" ? "i_owe" : "owed_to_me") as "i_owe" | "owed_to_me",
      amountSGD: t.amount,
      originalAmount: t.amount,
      currency: "SGD",
      rate: 1,
      note: `Group: ${expNotes}`,
      date: new Date().toISOString(),
    }));
    update((s) => ({ ...s, ledger: [...myBills, ...s.ledger] }));
    onUpdateGroup({ ...groupRef.current, members, expenses, addedToSplits: true });
    setSummary(
      myLegs
        .map((t) =>
          t.from === "You"
            ? `hey ${t.to}!! jccash bot has determined i owe u S$${fmt(t.amount)} from our group tab. on my way bestie`
            : `hey ${t.from}!! jccash bot settlement notice: u owe me S$${fmt(t.amount)} from our group tab. whenever ur ready`,
        )
        .join("\n"),
    );
  };

  const shareSummary = async () => {
    if (navigator.share) await navigator.share({ text: summary }).catch(() => {});
    else await navigator.clipboard.writeText(summary).catch(() => {});
  };

  const deleteExpense = (id: string) => {
    const next = expenses.filter((e) => e.id !== id);
    setExpenses(next);
    onUpdateGroup({ ...groupRef.current, members, expenses: next, addedToSplits: false });
  };

  const shareGroupChat = async () => {
    const totalSGD = expenses.reduce((a, e) => a + e.totalSGD, 0);
    const lines = transfers.map((t) => `  ${t.from} → ${t.to}: S$${fmt(t.amount)}`).join("\n");
    const msg =
      transfers.length === 0
        ? `${group.name} tab: all settled up! S$${fmt(totalSGD, 0)} total across ${expenses.length} expense${expenses.length !== 1 ? "s" : ""}`
        : `${group.name} tab\n\nwho pays who:\n${lines}\n\ntotal: S$${fmt(totalSGD, 0)}`;
    if (navigator.share) await navigator.share({ text: msg }).catch(() => {});
    else await navigator.clipboard.writeText(msg).catch(() => {});
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground">
          ←
        </button>
        <p className="flex-1 truncate font-semibold">{group.name}</p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {activeMembers.map((m) => (
            <span
              key={m}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${m === "You" ? "border-primary/60 text-primary" : ""}`}
            >
              {m}
              {m !== "You" && (
                <button
                  onClick={() => setMembers((prev) => prev.filter((x) => x !== m))}
                  className="text-muted-foreground hover:text-accent"
                >
                  ✕
                </button>
              )}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={newMember} onChange={setNewMember} placeholder="Add person" />
          <button
            onClick={() => {
              const n = newMember.trim();
              if (n && !members.includes(n)) {
                setMembers((m) => [...m, n]);
                setNewMember("");
              }
            }}
            className="rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
          >
            Add
          </button>
        </div>
      </div>

      {activeMembers.length >= 2 && (
        <button
          onClick={() => setAddingExpense(true)}
          className="w-full rounded-xl border border-primary py-3 text-sm font-semibold text-primary"
        >
          + Add expense
        </button>
      )}

      {expenses.length > 0 && (
        <div className="space-y-4">
          <div className="divide-y">
            {expenses.map((exp) => (
              <div key={exp.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{exp.note || "expense"}</p>
                  <p className="text-xs text-muted-foreground">
                    {exp.paidBy} paid
                    {exp.currency !== "SGD" ? ` · ${exp.currency} ${fmt(exp.total, 0)}` : ""}
                    {" · "}S${fmt(exp.totalSGD, 0)}
                  </p>
                </div>
                <button
                  onClick={() => loadForEdit(exp)}
                  className="shrink-0 text-xs text-muted-foreground hover:text-primary"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteExpense(exp.id)}
                  className="shrink-0 text-xs text-muted-foreground hover:text-accent"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-4 border-t pt-3">
            <div>
              <p className="label-caps mb-2">who pays who</p>
              {transfers.length === 0 ? (
                <p className="text-sm text-muted-foreground">all settled up</p>
              ) : (
                <div className="space-y-1">
                  {transfers.map((t, i) => (
                    <div key={i} className="flex items-center gap-2 py-1 text-sm">
                      <span
                        className={
                          t.from === "You" ? "font-semibold text-accent" : "text-muted-foreground"
                        }
                      >
                        {t.from}
                      </span>
                      <span className="text-xs text-muted-foreground">→</span>
                      <span
                        className={
                          t.to === "You" ? "font-semibold text-primary" : "text-muted-foreground"
                        }
                      >
                        {t.to}
                      </span>
                      <span className="ml-auto font-mono text-sm font-semibold">
                        S${fmt(t.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setBreakdownOpen((o) => !o)}
              className="flex w-full items-center justify-between text-xs text-muted-foreground"
            >
              <span>per person breakdown</span>
              <span>{breakdownOpen ? "▲" : "▼"}</span>
            </button>

            {breakdownOpen && (
              <div className="space-y-3 border-t pt-3">
                {activeMembers.map((m) => {
                  const paid = expenses
                    .filter((e) => e.paidBy === m)
                    .reduce((a, e) => a + e.totalSGD, 0);
                  const owes = expenses.reduce((a, e) => a + (getSharesSGD(e)[m] ?? 0), 0);
                  const net = Math.round((paid - owes) * 100) / 100;
                  return (
                    <div key={m} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p
                          className={`truncate text-sm font-semibold ${m === "You" ? "text-primary" : ""}`}
                        >
                          {m}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          paid S${fmt(paid, 0)} · share S${fmt(owes, 0)}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-sm font-bold">
                        {net > 0.005 ? (
                          <span className="text-primary">+S${fmt(net)}</span>
                        ) : net < -0.005 ? (
                          <span className="text-accent">-S${fmt(-net)}</span>
                        ) : (
                          <span className="text-muted-foreground">settled</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {summary ? (
              <div className="space-y-2 rounded-xl border bg-muted p-4">
                <p className="whitespace-pre-line font-mono text-xs">{summary}</p>
                <div className="flex gap-2">
                  <button
                    onClick={shareSummary}
                    className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground"
                  >
                    Share
                  </button>
                  <button
                    onClick={() => setSummary("")}
                    className="rounded-xl border px-4 py-2.5 text-sm text-muted-foreground"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                {transfers.some((t) => t.from === "You" || t.to === "You") && (
                  <button
                    onClick={createGroupSplits}
                    disabled={group.addedToSplits}
                    className="flex-1 rounded-xl border border-primary py-2.5 text-sm font-semibold text-primary disabled:opacity-40"
                  >
                    {group.addedToSplits ? "Added" : "Add to splits"}
                  </button>
                )}
                <button
                  onClick={shareGroupChat}
                  className="flex-1 rounded-xl border py-2.5 text-sm font-semibold text-muted-foreground"
                >
                  Share to group
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {expenses.length === 0 && activeMembers.length >= 2 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          add an expense to see who owes who
        </p>
      )}

      <button onClick={onDelete} className="w-full pt-2 text-sm text-accent/60 hover:text-accent">
        Delete group
      </button>

      {addingExpense && (
        <Sheet
          onClose={() => {
            setAddingExpense(false);
            resetForm();
          }}
          className="p-5 pb-8"
          style={{ maxHeight: "85dvh", overflowY: "auto" }}
        >
          <p className="label-caps mb-4">{editingExpenseId ? "edit expense" : "add expense"}</p>
          <div className="space-y-3">
            <select
              value={expPaidBy}
              onChange={(e) => setExpPaidBy(e.target.value)}
              className="w-full rounded-xl border bg-muted px-3 py-2.5 text-sm outline-none focus:border-primary"
            >
              {activeMembers.map((m) => (
                <option key={m} className="bg-background">
                  {m}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Input value={expTotal} onChange={setExpTotal} placeholder="Amount" type="number" />
              <CurrencySelect
                value={expCurrency}
                onChange={setExpCurrency}
                className="rounded-xl border bg-muted px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <RateHint fetching={gFetching} rate={gFetchedRate} currency={expCurrency} />
            <Input value={expNote} onChange={setExpNote} placeholder="What for?" />

            <button
              onClick={() => setSplitOptionsOpen((o) => !o)}
              className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs text-muted-foreground"
            >
              <span>
                Split ·{" "}
                {expSplitMode === "equal"
                  ? `equal, ${expParticipants.length} people`
                  : "custom amounts"}
              </span>
              <span>{splitOptionsOpen ? "▲" : "▼"}</span>
            </button>

            {splitOptionsOpen && (
              <div className="space-y-3 rounded-xl border bg-muted/30 p-3">
                <div className="flex rounded-lg border p-0.5 text-xs font-semibold">
                  {(["equal", "unequal"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setExpSplitMode(m)}
                      className={`flex-1 rounded-md py-1.5 capitalize transition ${expSplitMode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                    >
                      {m === "unequal" ? "custom" : m}
                    </button>
                  ))}
                </div>

                {expSplitMode === "equal" ? (
                  <div>
                    <p className="mb-2 text-xs text-muted-foreground">Who's splitting this?</p>
                    <div className="flex flex-wrap gap-2">
                      {activeMembers.map((m) => {
                        const checked = expParticipants.includes(m);
                        return (
                          <button
                            key={m}
                            onClick={() =>
                              setExpParticipants((prev) =>
                                checked ? prev.filter((x) => x !== m) : [...prev, m],
                              )
                            }
                            className={`rounded-full border px-3 py-1 text-xs transition ${checked ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"}`}
                          >
                            {m}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        Amount per person ({expCurrency})
                      </p>
                      {unassigned > 0.005 && (
                        <button
                          onClick={splitRestEqually}
                          className="rounded-lg border border-primary px-2 py-1 text-xs font-semibold text-primary"
                        >
                          split rest equally
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {activeMembers.map((m) => (
                        <div
                          key={m}
                          className="flex items-center gap-2 rounded-xl border bg-muted px-3 py-2.5"
                        >
                          <span
                            className={`min-w-0 flex-1 truncate text-sm font-medium ${m === "You" ? "text-primary" : ""}`}
                          >
                            {m}
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {expCurrency}
                          </span>
                          <input
                            type="number"
                            inputMode="decimal"
                            value={expShares[m] ?? ""}
                            onChange={(e) =>
                              setExpShares((prev) => ({ ...prev, [m]: e.target.value }))
                            }
                            placeholder="0"
                            className="w-24 shrink-0 bg-transparent text-right text-sm outline-none"
                          />
                        </div>
                      ))}
                    </div>
                    <p
                      className={`text-right font-mono text-xs ${Math.abs(unassigned) < 0.005 ? "text-primary" : "text-accent"}`}
                    >
                      unassigned: {expCurrency} {fmt(Math.abs(unassigned))}
                      {unassigned < -0.005 ? " (over!)" : ""}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  setAddingExpense(false);
                  resetForm();
                }}
                className="rounded-xl border px-4 py-3 text-sm text-muted-foreground"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  submitExpense();
                  setAddingExpense(false);
                }}
                disabled={!canAdd}
                className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-40"
              >
                {editingExpenseId ? "Save" : "Add"}
              </button>
            </div>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function Input({
  value,
  onChange,
  onBlur,
  placeholder,
  type = "text",
  className = "",
}: {
  value: string | number;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      className={`w-full min-w-0 rounded-xl border bg-muted px-3 py-2.5 text-sm outline-none focus:border-primary ${className}`}
    />
  );
}

function Sheet({
  onClose,
  children,
  className = "p-5 pb-8",
  style,
  z = "z-40",
}: {
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  z?: string;
}) {
  return (
    <div
      className={`fixed inset-0 ${z} flex items-end bg-background/70 backdrop-blur-sm animate-in fade-in`}
      onClick={onClose}
    >
      <div
        className={`mx-auto w-full max-w-md rounded-t-[2rem] border-t bg-background animate-in slide-in-from-bottom duration-300 ${className}`}
        style={style}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function RateHint({
  fetching,
  rate,
  currency,
}: {
  fetching: boolean;
  rate: number | null;
  currency: string;
}) {
  if (currency === "SGD") return null;
  return (
    <p className="font-mono text-xs text-muted-foreground">
      {fetching ? "fetching rate..." : rate ? `1 ${currency} = ${rate} SGD` : "rate unavailable"}
    </p>
  );
}

function CurrencySelect({
  value,
  onChange,
  className = "rounded-xl border bg-muted px-2 text-sm outline-none focus:border-primary",
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={className}>
      {CURRENCIES.map((c) => (
        <option key={c} className="bg-background">
          {c}
        </option>
      ))}
    </select>
  );
}

function Settings({ state, update, isDark }: { state: State; update: Upd; isDark: boolean }) {
  const set = <K extends keyof State>(k: K, v: State[K]) => update((s) => ({ ...s, [k]: v }));
  const [trip, setTrip] = useState("");
  const [rl, setRl] = useState("");
  const [ra, setRa] = useState("");
  const [rc, setRc] = useState("Rent");
  const [fetching, setFetching] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState(state.budgetSgd ? String(state.budgetSgd) : "");
  const [rateDraft, setRateDraft] = useState(state.rate ? String(state.rate) : "");
  const [cashDraft, setCashDraft] = useState(String(state.cashWithdrawn ?? 0));
  useEffect(() => {
    setRateDraft(state.rate ? String(state.rate) : "");
  }, [state.rate]);
  const [rateError, setRateError] = useState("");

  const backup = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }),
    );
    a.download = `jccash-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };
  const restore = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result;
        if (typeof text !== "string") return;
        update(() => JSON.parse(text) as State);
      } catch {
        /* ignore invalid file */
      }
    };
    reader.readAsText(file);
  };

  const fetchRate = async () => {
    if (state.currency === "SGD") {
      set("rate", 1);
      return;
    }
    setFetching(true);
    setRateError("");
    try {
      const res = await fetch(
        `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${state.currency.toLowerCase()}.json`,
      );
      if (!res.ok) throw new Error();
      const data = (await res.json()) as Record<string, Record<string, number>>;
      const r = data[state.currency.toLowerCase()]?.["sgd"];
      if (!r) throw new Error();
      set("rate", Math.round(r * 10000) / 10000);
    } catch {
      setRateError("Could not fetch — check connection");
    } finally {
      setFetching(false);
    }
  };

  return (
    <div className="animate-in fade-in space-y-6 duration-500">
      <div>
        <p className="label-caps mb-2 px-1">Budget</p>
        <div className="divide-y overflow-hidden rounded-2xl border">
          <div className="flex items-center gap-3 bg-card px-4 py-3">
            <span className="flex-1 text-sm">Total (SGD)</span>
            <input
              type="number"
              value={budgetDraft}
              onChange={(e) => setBudgetDraft(e.target.value)}
              onBlur={() => set("budgetSgd", parseFloat(budgetDraft) || 0)}
              className="w-28 rounded-lg border bg-muted px-2 py-1 text-right text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-3 bg-card px-4 py-3">
            <span className="flex-1 text-sm">Start</span>
            <input
              type="date"
              value={state.start}
              onChange={(e) => set("start", e.target.value)}
              className="rounded-lg border bg-muted px-2 py-1 text-xs outline-none focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-3 bg-card px-4 py-3">
            <span className="flex-1 text-sm">End</span>
            <input
              type="date"
              value={state.end}
              onChange={(e) => set("end", e.target.value)}
              className="rounded-lg border bg-muted px-2 py-1 text-xs outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      <div>
        <p className="label-caps mb-2 px-1">Currency & rate</p>
        <div className="divide-y overflow-hidden rounded-2xl border">
          <div className="flex items-center gap-3 bg-card px-4 py-3">
            <span className="flex-1 text-sm">Trip currency</span>
            <select
              value={state.currency}
              onChange={(e) => {
                set("currency", e.target.value);
                setRateError("");
              }}
              className="rounded-lg border bg-muted px-2 py-1 text-sm outline-none focus:border-primary"
            >
              {CURRENCIES.map((c) => (
                <option key={c} className="bg-background">
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3 bg-card px-4 py-3">
            <span className="flex-1 text-sm">1 {state.currency} = ? SGD</span>
            <div className="flex gap-1.5">
              <input
                type="number"
                value={rateDraft}
                onChange={(e) => setRateDraft(e.target.value)}
                onBlur={() => set("rate", parseFloat(rateDraft) || 0)}
                className="w-20 rounded-lg border bg-muted px-2 py-1 text-right text-sm outline-none focus:border-primary"
              />
              <button
                onClick={fetchRate}
                disabled={fetching || !state.currency}
                className="rounded-lg border border-primary px-2.5 py-1 text-xs font-semibold text-primary disabled:opacity-40"
              >
                {fetching ? "..." : "Fetch"}
              </button>
            </div>
          </div>
          {rateError && (
            <div className="bg-card px-4 py-2">
              <p className="text-xs text-accent">{rateError}</p>
            </div>
          )}
          <div className="flex items-center gap-3 bg-card px-4 py-3">
            <span className="flex-1 text-sm">Cash withdrawn ({state.currency})</span>
            <input
              type="number"
              min="0"
              value={cashDraft}
              onChange={(e) => setCashDraft(e.target.value)}
              onBlur={() => set("cashWithdrawn", Math.max(0, parseFloat(cashDraft) || 0))}
              className="w-24 rounded-lg border bg-muted px-2 py-1 text-right text-sm outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      <div>
        <p className="label-caps mb-2 px-1">Trip tags</p>
        <div className="divide-y overflow-hidden rounded-2xl border">
          {state.trips.length > 0 && (
            <div className="flex flex-wrap gap-2 bg-card px-4 py-3">
              {state.trips.map((t) => (
                <span
                  key={t}
                  className="flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1 text-xs"
                >
                  {t}
                  <button
                    onClick={() =>
                      update((s) => {
                        const trips = s.trips.filter((x) => x !== t);
                        return {
                          ...s,
                          trips,
                          activeTrip: s.activeTrip === t ? (trips[0] ?? "") : s.activeTrip,
                        };
                      })
                    }
                    className="text-muted-foreground hover:text-accent"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 bg-card px-4 py-3">
            <input
              value={trip}
              onChange={(e) => setTrip(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && trip && !state.trips.includes(trip)) {
                  update((s) => ({ ...s, trips: [...s.trips, trip], activeTrip: trip }));
                  setTrip("");
                }
              }}
              placeholder="Add trip"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <button
              onClick={() => {
                if (trip && !state.trips.includes(trip))
                  update((s) => ({ ...s, trips: [...s.trips, trip], activeTrip: trip }));
                setTrip("");
              }}
              className="rounded-lg bg-primary px-3 py-1 text-xs font-bold text-primary-foreground"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      <div>
        <p className="label-caps mb-2 px-1">Monthly costs · auto-added</p>
        <div className="divide-y overflow-hidden rounded-2xl border">
          {state.recurring.map((r) => (
            <div key={r.id} className="flex items-center gap-3 bg-card px-4 py-3">
              <span className="text-base">{CAT_EMOJI[r.category]}</span>
              <span className="flex-1 text-sm">{r.label}</span>
              <span className="font-mono text-sm text-muted-foreground">
                {state.currency} {fmt(r.amount)}
              </span>
              <button
                onClick={() =>
                  update((s) => ({ ...s, recurring: s.recurring.filter((x) => x.id !== r.id) }))
                }
                className="text-muted-foreground hover:text-accent"
              >
                ✕
              </button>
            </div>
          ))}
          <div className="space-y-2 bg-card px-4 py-3">
            <p className="label-caps">new recurring cost</p>
            <Input value={rl} onChange={setRl} placeholder="Label" />
            <div className="flex gap-2">
              <Input type="number" value={ra} onChange={setRa} placeholder="Amount" />
              <select
                value={rc}
                onChange={(e) => setRc(e.target.value)}
                className="rounded-lg border bg-muted px-2 text-xs"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} className="bg-background">
                    {c}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  if (rl && +ra)
                    update((s) => ({
                      ...s,
                      recurring: [
                        ...s.recurring,
                        { id: uid(), label: rl, amount: +ra, category: rc, lastAdded: "" },
                      ],
                    }));
                  setRl("");
                  setRa("");
                }}
                className="rounded-lg bg-primary px-3 py-1 text-xs font-bold text-primary-foreground"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>

      <div>
        <p className="label-caps mb-2 px-1">Appearance</p>
        <div className="divide-y overflow-hidden rounded-2xl border">
          <div className="flex items-center gap-3 bg-card px-4 py-3">
            <span className="flex-1 text-sm">Color mode</span>
            <div className="flex rounded-lg border bg-muted p-0.5 text-xs font-semibold">
              {(["auto", "dark", "light"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => set("colorMode", m)}
                  className={`rounded-md px-2.5 py-1 capitalize ${(state.colorMode ?? "auto") === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 bg-card px-4 py-3">
            <span className="flex-1 text-sm">Accent</span>
            <div className="flex gap-2.5">
              {Object.entries(THEMES).map(([key, t]) => (
                <button
                  key={key}
                  onClick={() => set("theme", key)}
                  title={t.label}
                  className={`size-7 rounded-full transition-all ${(state.theme ?? "green") === key ? "scale-110 ring-2 ring-offset-2 ring-offset-background" : "opacity-60"}`}
                  style={{
                    background: isDark ? t.dark.primary : t.light.primary,
                    outlineColor: isDark ? t.dark.primary : t.light.primary,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        <p className="label-caps mb-2 px-1">Data</p>
        <div className="divide-y overflow-hidden rounded-2xl border">
          <button
            onClick={backup}
            className="flex w-full items-center gap-3 bg-card px-4 py-3 text-left active:bg-muted"
          >
            <span className="flex-1 text-sm">Backup</span>
            <span className="text-xs text-muted-foreground">Download JSON</span>
          </button>
          <label className="flex cursor-pointer items-center gap-3 bg-card px-4 py-3 active:bg-muted">
            <span className="flex-1 text-sm">Restore</span>
            <span className="text-xs text-muted-foreground">From JSON</span>
            <input type="file" accept=".json" className="hidden" onChange={restore} />
          </label>
          <button
            onClick={() => exportCsv(state)}
            className="flex w-full items-center gap-3 bg-card px-4 py-3 text-left active:bg-muted"
          >
            <span className="flex-1 text-sm">Export CSV</span>
            <span className="text-xs text-muted-foreground">Spreadsheet</span>
          </button>
          <button
            onClick={() => {
              if (confirm("Delete all expenses?"))
                update((s) => ({ ...s, expenses: [], splits: [] }));
            }}
            className="flex w-full items-center bg-card px-4 py-3 text-left active:bg-muted"
          >
            <span className="flex-1 text-sm text-accent">Clear all data</span>
          </button>
        </div>
        <p className="label-caps mt-3 text-center">offline · stays on device</p>
      </div>
    </div>
  );
}
