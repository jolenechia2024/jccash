import { createFileRoute } from "@tanstack/react-router";
import capybaraLogo from "@/assets/capybara-logo.png";
import { useState } from "react";
import {
  CATEGORIES, CAT_EMOJI, exportCsv, fmt, sgd, stats, uid, useStore, type State,
} from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tally — exchange budget tracker" },
      { name: "description", content: "Log spending in 2 taps, see SGD equivalents and how much you can spend per day. Offline, no login." },
      { property: "og:title", content: "Tally — exchange budget tracker" },
      { property: "og:description", content: "Two-tap expense logging with daily budget left, multi-currency and split bills." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: App,
});

type Tab = "home" | "stats" | "split" | "settings";
type Upd = (fn: (s: State) => State) => void;

function App() {
  const { state, update } = useStore();
  const [tab, setTab] = useState<Tab>("home");
  const [adding, setAdding] = useState(false);

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-32 -left-24 size-[420px] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute top-1/2 -right-32 size-[380px] rounded-full bg-accent/15 blur-[130px]" />
      </div>
      <div className="relative mx-auto max-w-md px-5 pb-32 pt-6">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={capybaraLogo} alt="Tally capybara" width={1024} height={1024} className="size-9 rounded-lg ring-1 ring-primary/40" />
            <span className="text-sm font-semibold uppercase tracking-[0.25em]">Tally</span>
          </div>
          <select
            value={state.activeTrip}
            onChange={(e) => update((s) => ({ ...s, activeTrip: e.target.value }))}
            className="rounded-full border bg-muted px-3 py-1.5 text-xs text-muted-foreground outline-none"
          >
            {state.trips.map((t) => <option key={t} className="bg-background">{t}</option>)}
          </select>
        </header>

        {tab === "home" && <Home state={state} update={update} />}
        {tab === "stats" && <Stats state={state} />}
        {tab === "split" && <SplitView state={state} update={update} />}
        {tab === "settings" && <Settings state={state} update={update} />}
      </div>

      {adding && <QuickAdd state={state} update={update} onClose={() => setAdding(false)} />}

      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md px-4 pb-4">
        <div className="glass flex items-center justify-around px-2 py-2">
          {(["home", "stats"] as Tab[]).map((t) => <NavBtn key={t} t={t} tab={tab} setTab={setTab} />)}
          <button
            onClick={() => setAdding(true)}
            aria-label="Add expense"
            className="-mt-8 grid size-14 place-items-center rounded-full bg-primary text-2xl font-bold text-primary-foreground shadow-[0_0_30px_-4px_var(--primary)] ring-4 ring-background transition active:scale-90"
          >+</button>
          {(["split", "settings"] as Tab[]).map((t) => <NavBtn key={t} t={t} tab={tab} setTab={setTab} />)}
        </div>
      </nav>
    </div>
  );
}

function NavBtn({ t, tab, setTab }: { t: Tab; tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <button onClick={() => setTab(t)} className={`rounded-xl px-3 py-2 text-xs font-semibold capitalize transition ${tab === t ? "text-primary" : "text-muted-foreground"}`}>
      {t}
    </button>
  );
}

function Home({ state, update }: { state: State; update: Upd }) {
  const st = stats(state);
  const pct = Math.min(100, Math.max(0, (st.spent / state.budgetSgd) * 100));
  const over = st.todayLeft < 0;
  const owed = state.splits.filter((s) => !s.paid).reduce((a, s) => a + s.amount, 0);
  const recent = state.expenses.slice(0, 8);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <section className="glass relative overflow-hidden p-7">
        <div className="absolute -right-20 -top-20 size-56 rotate-12 rounded-3xl bg-primary/20 blur-2xl" />
        <p className="label-caps relative">You can spend</p>
        <div className="relative mt-3 font-mono text-6xl font-bold tracking-tighter tabular-nums">
          S${fmt(Math.max(0, st.perDay), 0)}<span className="text-2xl text-muted-foreground">/day</span>
        </div>
        <p className="relative mt-2 text-sm text-muted-foreground">
          for the rest of the trip · {st.daysLeft} days left · S${fmt(st.perWeek, 0)}/week
        </p>
        <div className="relative mt-6 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="relative mt-3 flex justify-between font-mono text-xs text-muted-foreground">
          <span>S${fmt(st.spent, 0)} of {fmt(state.budgetSgd, 0)}</span>
          <span className={over ? "text-accent" : "text-primary"}>
            {over ? `S$${fmt(-st.todayLeft)} over today` : `S$${fmt(st.todayLeft)} left today`}
          </span>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <div className="glass p-4">
          <p className="label-caps">Cash left</p>
          <p className="mt-1 font-mono text-xl font-bold">{state.currency} {fmt(st.cashLeft, 0)}</p>
        </div>
        <div className="glass p-4">
          <p className="label-caps">Owed to you</p>
          <p className="mt-1 font-mono text-xl font-bold text-primary">S${fmt(owed, 0)}</p>
        </div>
      </div>

      <section className="glass p-5">
        <p className="label-caps mb-2">Recent</p>
        {recent.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Tap + to log your first spend.</p>}
        <div className="divide-y">
          {recent.map((e) => (
            <div key={e.id} className="group flex items-center gap-3 py-3">
              <div className="grid size-9 place-items-center rounded-xl bg-muted">{CAT_EMOJI[e.category]}</div>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-sm font-medium">{e.note || e.category}</p>
                <p className="text-xs text-muted-foreground">{e.method} · {e.trip} · {new Date(e.date).toLocaleDateString("en-SG", { day: "numeric", month: "short" })}</p>
              </div>
              <div className="text-right leading-tight">
                <p className="font-mono text-sm font-semibold">{e.currency} {fmt(e.amount)}</p>
                <p className="font-mono text-xs text-primary">S${fmt(sgd(e))}</p>
              </div>
              <button
                onClick={() => update((s) => ({ ...s, expenses: s.expenses.filter((x) => x.id !== e.id) }))}
                className="text-xs text-muted-foreground hover:text-accent"
                aria-label="Delete"
              >✕</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function QuickAdd({ state, update, onClose }: { state: State; update: Upd; onClose: () => void }) {
  const [amt, setAmt] = useState("");
  const [note, setNote] = useState("");
  const [method, setMethod] = useState<"card" | "cash">("card");
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
      expenses: [{ id: uid(), amount: n, currency: s.currency, rate: s.rate, category, note, method, trip: s.activeTrip, date: new Date().toISOString() }, ...s.expenses],
    }));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-background/70 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
      <div className="mx-auto w-full max-w-md rounded-t-[2rem] border-t bg-background p-5 pb-8 animate-in slide-in-from-bottom duration-300" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-muted-foreground">{state.currency}</span>
          <span className="font-mono text-5xl font-bold tabular-nums">{amt || "0"}</span>
        </div>
        <p className="mt-1 text-right font-mono text-sm text-primary">≈ S${fmt(n * state.rate)}</p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"].map((k) => (
            <button key={k} onClick={() => press(k)} className="h-12 rounded-xl bg-muted font-mono text-lg active:bg-secondary">{k}</button>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="min-w-0 flex-1 rounded-xl border bg-muted px-3 py-2.5 text-sm outline-none focus:border-primary" />
          <div className="flex rounded-xl border bg-muted p-1 text-xs font-semibold">
            {(["card", "cash"] as const).map((m) => (
              <button key={m} onClick={() => setMethod(m)} className={`rounded-lg px-3 capitalize ${method === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{m}</button>
            ))}
          </div>
        </div>

        <p className="label-caps mb-2 mt-4">Tap a category to save</p>
        <div className="grid grid-cols-4 gap-2">
          {CATEGORIES.map((c) => (
            <button key={c} disabled={n <= 0} onClick={() => save(c)} className="flex flex-col items-center gap-1 rounded-xl border bg-muted py-2.5 text-xs transition active:scale-95 enabled:hover:border-primary disabled:opacity-40">
              <span className="text-lg">{CAT_EMOJI[c]}</span>{c}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const CHART = ["var(--primary)", "var(--accent)", "oklch(0.6 0.15 150)", "oklch(0.75 0.15 30)", "oklch(0.45 0.12 150)", "oklch(0.5 0.18 20)", "oklch(0.7 0 0)"];

function Stats({ state }: { state: State }) {
  const [trip, setTrip] = useState("All");
  const list = state.expenses.filter((e) => trip === "All" || e.trip === trip);
  const total = list.reduce((a, e) => a + sgd(e), 0);
  const rows = CATEGORIES.map((c, i) => ({ c, color: CHART[i], v: list.filter((e) => e.category === c).reduce((a, e) => a + sgd(e), 0) }))
    .filter((r) => r.v > 0).sort((a, b) => b.v - a.v);
  let acc = 0;
  const grad = rows.map((r) => { const s = acc; acc += (r.v / total) * 100; return `${r.color} ${s}% ${acc}%`; }).join(",");
  const cash = list.filter((e) => e.method === "cash").reduce((a, e) => a + sgd(e), 0);

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex gap-2 overflow-x-auto">
        {["All", ...state.trips].map((t) => (
          <button key={t} onClick={() => setTrip(t)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs ${trip === t ? "border-primary text-primary" : "text-muted-foreground"}`}>{t}</button>
        ))}
      </div>
      <section className="glass p-6">
        <p className="label-caps">Where it's going</p>
        {total === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">Nothing logged yet.</p> : (
          <>
            <div className="relative mx-auto my-6 size-44 rounded-full" style={{ background: `conic-gradient(${grad})` }}>
              <div className="absolute inset-5 grid place-items-center rounded-full bg-background text-center">
                <div><p className="font-mono text-2xl font-bold">S${fmt(total, 0)}</p><p className="text-xs text-muted-foreground">total</p></div>
              </div>
            </div>
            <div className="space-y-3">
              {rows.map((r) => (
                <div key={r.c} className="flex items-center gap-3 text-sm">
                  <span className="size-2.5 rounded-full" style={{ background: r.color }} />
                  <span className="flex-1">{r.c}</span>
                  <span className="font-mono text-muted-foreground">S${fmt(r.v, 0)} · {Math.round((r.v / total) * 100)}%</span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
      <section className="glass grid grid-cols-2 gap-4 p-5">
        <div><p className="label-caps">Card</p><p className="mt-1 font-mono text-lg font-bold">S${fmt(total - cash, 0)}</p></div>
        <div><p className="label-caps">Cash</p><p className="mt-1 font-mono text-lg font-bold">S${fmt(cash, 0)}</p></div>
      </section>
    </div>
  );
}

function SplitView({ state, update }: { state: State; update: Upd }) {
  const [name, setName] = useState("");
  const [amt, setAmt] = useState("");
  const [note, setNote] = useState("");
  const add = () => {
    const a = parseFloat(amt);
    if (!name || !a) return;
    update((s) => ({ ...s, splits: [{ id: uid(), name, amount: a * s.rate, currency: s.currency, note, paid: false }, ...s.splits] }));
    setName(""); setAmt(""); setNote("");
  };
  const owed = state.splits.filter((s) => !s.paid).reduce((a, s) => a + s.amount, 0);

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <section className="glass p-6">
        <p className="label-caps">Friends owe you</p>
        <p className="mt-2 font-mono text-5xl font-bold text-primary">S${fmt(owed)}</p>
      </section>
      <section className="glass space-y-2 p-5">
        <div className="flex gap-2">
          <Input value={name} onChange={setName} placeholder="Who" />
          <Input value={amt} onChange={setAmt} placeholder={`Owes (${state.currency})`} type="number" />
        </div>
        <Input value={note} onChange={setNote} placeholder="For what? (optional)" />
        <button onClick={add} className="w-full rounded-xl bg-primary py-3 text-sm font-bold uppercase tracking-widest text-primary-foreground">Add</button>
      </section>
      <div className="space-y-2">
        {state.splits.map((s) => (
          <div key={s.id} className={`glass flex items-center gap-3 rounded-2xl px-4 py-3 ${s.paid ? "opacity-50" : ""}`}>
            <button
              onClick={() => update((st) => ({ ...st, splits: st.splits.map((x) => x.id === s.id ? { ...x, paid: !x.paid } : x) }))}
              className={`grid size-6 place-items-center rounded-full border text-xs ${s.paid ? "border-primary bg-primary text-primary-foreground" : ""}`}
              aria-label="Mark paid"
            >{s.paid && "✓"}</button>
            <div className="flex-1 leading-tight">
              <p className={`text-sm font-medium ${s.paid ? "line-through" : ""}`}>{s.name}</p>
              {s.note && <p className="text-xs text-muted-foreground">{s.note}</p>}
            </div>
            <span className="font-mono text-sm font-bold">S${fmt(s.amount)}</span>
            <button onClick={() => update((st) => ({ ...st, splits: st.splits.filter((x) => x.id !== s.id) }))} className="text-xs text-muted-foreground hover:text-accent">✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text" }: { value: string | number; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full min-w-0 rounded-xl border bg-muted px-3 py-2.5 text-sm outline-none focus:border-primary" />;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="label-caps">{label}</span>{children}</label>;
}

function Settings({ state, update }: { state: State; update: Upd }) {
  const set = <K extends keyof State>(k: K, v: State[K]) => update((s) => ({ ...s, [k]: v }));
  const [trip, setTrip] = useState("");
  const [rl, setRl] = useState(""); const [ra, setRa] = useState(""); const [rc, setRc] = useState("Rent");

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <section className="glass space-y-4 p-5">
        <Field label="Total budget (SGD)"><Input type="number" value={state.budgetSgd} onChange={(v) => set("budgetSgd", +v || 0)} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Start"><Input type="date" value={state.start} onChange={(v) => set("start", v)} /></Field>
          <Field label="End"><Input type="date" value={state.end} onChange={(v) => set("end", v)} /></Field>
        </div>
      </section>

      <section className="glass space-y-4 p-5">
        <p className="label-caps text-primary">Exchange rate · works offline</p>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm">1</span>
          <div className="w-24"><Input value={state.currency} onChange={(v) => set("currency", v.toUpperCase().slice(0, 4))} /></div>
          <span className="font-mono text-sm">=</span>
          <Input type="number" value={state.rate} onChange={(v) => set("rate", +v || 0)} />
          <span className="font-mono text-sm">SGD</span>
        </div>
        <Field label={`Cash withdrawn (${state.currency})`}><Input type="number" value={state.cashWithdrawn} onChange={(v) => set("cashWithdrawn", +v || 0)} /></Field>
      </section>

      <section className="glass space-y-3 p-5">
        <p className="label-caps">Trip tags</p>
        <div className="flex flex-wrap gap-2">
          {state.trips.map((t) => (
            <span key={t} className="flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
              {t}
              {t !== "Daily life" && <button onClick={() => update((s) => ({ ...s, trips: s.trips.filter((x) => x !== t), activeTrip: s.activeTrip === t ? "Daily life" : s.activeTrip }))} className="text-muted-foreground hover:text-accent">✕</button>}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={trip} onChange={setTrip} placeholder="e.g. Europe backpacking" />
          <button onClick={() => { if (trip && !state.trips.includes(trip)) update((s) => ({ ...s, trips: [...s.trips, trip], activeTrip: trip })); setTrip(""); }} className="rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">Add</button>
        </div>
      </section>

      <section className="glass space-y-3 p-5">
        <p className="label-caps">Monthly costs · auto-added</p>
        {state.recurring.map((r) => (
          <div key={r.id} className="flex items-center justify-between text-sm">
            <span>{CAT_EMOJI[r.category]} {r.label}</span>
            <span className="flex items-center gap-3 font-mono">{state.currency} {fmt(r.amount)}
              <button onClick={() => update((s) => ({ ...s, recurring: s.recurring.filter((x) => x.id !== r.id) }))} className="text-muted-foreground hover:text-accent">✕</button>
            </span>
          </div>
        ))}
        <div className="flex gap-2">
          <Input value={rl} onChange={setRl} placeholder="Rent" />
          <Input type="number" value={ra} onChange={setRa} placeholder="Amount" />
          <select value={rc} onChange={(e) => setRc(e.target.value)} className="rounded-xl border bg-muted px-2 text-sm">
            {CATEGORIES.map((c) => <option key={c} className="bg-background">{c}</option>)}
          </select>
        </div>
        <button onClick={() => { if (rl && +ra) update((s) => ({ ...s, recurring: [...s.recurring, { id: uid(), label: rl, amount: +ra, category: rc, lastAdded: "" }] })); setRl(""); setRa(""); }} className="w-full rounded-xl border border-primary py-2.5 text-sm font-semibold text-primary">Add monthly cost</button>
      </section>

      <section className="glass space-y-2 p-5">
        <button onClick={() => exportCsv(state)} className="w-full rounded-xl bg-primary py-3 text-sm font-bold uppercase tracking-widest text-primary-foreground">Export CSV</button>
        <button onClick={() => { if (confirm("Delete all expenses?")) update((s) => ({ ...s, expenses: [], splits: [] })); }} className="w-full rounded-xl border border-accent/50 py-3 text-sm font-semibold text-accent">Clear all data</button>
        <p className="pt-1 text-center text-xs text-muted-foreground">Saved on this device only · no login · nothing uploaded</p>
      </section>
    </div>
  );
}
