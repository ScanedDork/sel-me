import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { JOB_STATUSES } from "@/lib/types";
import { useMemo } from "react";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Pipeline — Sel me" }] }),
  component: AnalyticsPage,
});

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Mon=0
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x.getTime();
}

function AnalyticsPage() {
  const jobs = useStore((s) => s.jobs);
  const goals = useStore((s) => s.settings.weeklyGoals);

  const counts = useMemo(
    () => JOB_STATUSES.map((s) => ({ ...s, n: jobs.filter((j) => j.status === s.key).length })),
    [jobs],
  );

  const applied = jobs.filter((j) => ["applied", "screening", "interview", "offer", "rejected"].includes(j.status)).length;
  const responded = jobs.filter((j) => ["screening", "interview", "offer", "rejected"].includes(j.status)).length;
  const interviewed = jobs.filter((j) => ["interview", "offer"].includes(j.status)).length;
  const offered = jobs.filter((j) => j.status === "offer").length;

  // Avg time in current stage (days since updatedAt)
  const avgTimeInStage = (() => {
    const open = jobs.filter((j) => !["offer", "rejected", "withdrawn"].includes(j.status));
    if (!open.length) return 0;
    const ms = open.reduce((acc, j) => acc + (Date.now() - j.updatedAt), 0) / open.length;
    return Math.round(ms / 86_400_000);
  })();

  // Weekly streak
  const weekStart = startOfWeek(new Date());
  const thisWeekApps = jobs.filter((j) => j.appliedDate && new Date(j.appliedDate).getTime() >= weekStart).length;

  // Source ROI
  const sources = useMemo(() => {
    const map = new Map<string, { total: number; replied: number }>();
    for (const j of jobs) {
      if (!j.source) continue;
      const cur = map.get(j.source) ?? { total: 0, replied: 0 };
      cur.total++;
      if (["screening", "interview", "offer"].includes(j.status)) cur.replied++;
      map.set(j.source, cur);
    }
    return [...map.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [jobs]);

  const funnel = [
    { label: "Saved/Applied", value: jobs.length },
    { label: "Applied", value: applied },
    { label: "Responded", value: responded },
    { label: "Interviewed", value: interviewed },
    { label: "Offer", value: offered },
  ];
  const maxFunnel = Math.max(1, ...funnel.map((s) => s.value));

  return (
    <AppShell>
      <div className="px-6 md:px-10 py-8 max-w-6xl mx-auto space-y-8">
        <header className="flex justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Pipeline intelligence</h1>
            <p className="text-sm text-muted-foreground mt-1">Conversion rates, weekly goals, and source ROI.</p>
          </div>
          <Link to="/jobs" className="text-sm text-muted-foreground hover:text-foreground">View jobs →</Link>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPI label="Applied" value={applied} />
          <KPI label="Response rate" value={applied ? Math.round((responded / applied) * 100) : 0} suffix="%" />
          <KPI label="Interview rate" value={applied ? Math.round((interviewed / applied) * 100) : 0} suffix="%" />
          <KPI label="Avg days in stage" value={avgTimeInStage} />
        </section>

        <section className="glass rounded-2xl p-5">
          <h2 className="font-semibold mb-4">Funnel</h2>
          <div className="space-y-2">
            {funnel.map((f) => (
              <div key={f.label} className="flex items-center gap-3 text-sm">
                <span className="w-28 text-muted-foreground">{f.label}</span>
                <div className="flex-1 h-6 rounded-md bg-muted overflow-hidden">
                  <div
                    className="h-full bg-gradient-primary"
                    style={{ width: `${(f.value / maxFunnel) * 100}%` }}
                  />
                </div>
                <span className="w-10 text-right tabular-nums">{f.value}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-4">
          <div className="glass rounded-2xl p-5">
            <h2 className="font-semibold mb-3">This week</h2>
            <ProgressGoal label="Applications" value={thisWeekApps} goal={goals.applications} />
            <ProgressGoal label="Outreach (manual log)" value={0} goal={goals.outreach} />
            <p className="text-xs text-muted-foreground mt-3">
              Tip: applied dates are set automatically when you move a card to "Applied".
            </p>
          </div>
          <div className="glass rounded-2xl p-5">
            <h2 className="font-semibold mb-3">Source ROI</h2>
            {sources.length === 0 && <p className="text-sm text-muted-foreground">No sources tracked yet.</p>}
            <div className="space-y-2">
              {sources.map(([name, s]) => (
                <div key={name} className="flex items-center justify-between text-sm">
                  <span className="truncate">{name}</span>
                  <span className="text-muted-foreground">
                    {s.replied}/{s.total} replied ({Math.round((s.replied / s.total) * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="glass rounded-2xl p-5">
          <h2 className="font-semibold mb-3">Status breakdown</h2>
          <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
            {counts.map((c) => (
              <div key={c.key} className="rounded-xl border border-border p-3">
                <div className="text-2xl font-semibold">{c.n}</div>
                <div className="text-xs text-muted-foreground">{c.label}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function KPI({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-3xl font-semibold mt-2">{value}{suffix}</div>
    </div>
  );
}

function ProgressGoal({ label, value, goal }: { label: string; value: number; goal: number }) {
  const pct = goal ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  return (
    <div className="space-y-1 mb-3">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground tabular-nums">{value} / {goal}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-gradient-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
