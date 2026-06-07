import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { jobsToIcs } from "@/lib/ics";
import FileSaver from "file-saver";
import { Calendar, Download } from "lucide-react";
const { saveAs } = FileSaver;

export const Route = createFileRoute("/calendar")({
  head: () => ({ meta: [{ title: "Calendar — jobs" }] }),
  component: CalendarPage,
});

function CalendarPage() {
  const jobs = useStore((s) => s.jobs);
  const reminderDays = useStore((s) => s.settings.reminderDaysAfterApply);

  const interviews = useMemo(() => {
    const items: { when: Date; label: string; sub: string; href: string }[] = [];
    for (const j of jobs) {
      for (const r of j.rounds) {
        if (!r.scheduledAt) continue;
        const d = new Date(r.scheduledAt);
        if (isNaN(d.getTime())) continue;
        items.push({
          when: d,
          label: `${r.kind.replace("_", " ")} — ${j.company}`,
          sub: `${j.title} · ${r.interviewers || "TBD"}`,
          href: `/jobs/${j.id}`,
        });
      }
    }
    return items.sort((a, b) => a.when.getTime() - b.when.getTime());
  }, [jobs]);

  const followups = useMemo(() => {
    const items: { when: Date; label: string; sub: string; href: string }[] = [];
    for (const j of jobs) {
      if (!j.appliedDate) continue;
      const base = new Date(j.appliedDate);
      if (isNaN(base.getTime())) continue;
      for (const d of reminderDays) {
        const when = new Date(base);
        when.setDate(when.getDate() + d);
        if (when.getTime() < Date.now() - 86_400_000 * 2) continue;
        items.push({
          when,
          label: `Follow up · ${j.company}`,
          sub: `${d}d after applying for ${j.title}`,
          href: `/jobs/${j.id}`,
        });
      }
    }
    return items.sort((a, b) => a.when.getTime() - b.when.getTime());
  }, [jobs, reminderDays]);

  const onExport = () => {
    saveAs(new Blob([jobsToIcs(jobs)], { type: "text/calendar" }), "jobs-interviews.ics");
  };

  return (
    <AppShell>
      <div className="px-6 md:px-10 py-8 max-w-5xl mx-auto space-y-8">
        <header className="flex justify-between items-end flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Calendar</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Upcoming interviews and follow-up reminders from your applied dates.
            </p>
          </div>
          <Button onClick={onExport}><Download className="size-4" /> Export interviews (.ics)</Button>
        </header>

        <section className="glass rounded-2xl p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><Calendar className="size-4" /> Interviews</h2>
          {interviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">No scheduled rounds yet. Open a job → Interview tab to schedule.</p>
          ) : (
            <ul className="divide-y divide-border">
              {interviews.map((i, k) => (
                <li key={k} className="py-3 flex justify-between gap-3 text-sm">
                  <div>
                    <Link to={i.href} className="font-medium hover:underline">{i.label}</Link>
                    <div className="text-xs text-muted-foreground">{i.sub}</div>
                  </div>
                  <div className="text-xs text-muted-foreground tabular-nums">{i.when.toLocaleString()}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="glass rounded-2xl p-5">
          <h2 className="font-semibold mb-3">Follow-ups</h2>
          {followups.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing due — applied dates trigger reminders automatically.</p>
          ) : (
            <ul className="divide-y divide-border">
              {followups.map((i, k) => (
                <li key={k} className="py-3 flex justify-between gap-3 text-sm">
                  <div>
                    <Link to={i.href} className="font-medium hover:underline">{i.label}</Link>
                    <div className="text-xs text-muted-foreground">{i.sub}</div>
                  </div>
                  <div className={`text-xs tabular-nums ${i.when.getTime() < Date.now() ? "text-warning" : "text-muted-foreground"}`}>
                    {i.when.toLocaleDateString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
