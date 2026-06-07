import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { JOB_STATUSES } from "@/lib/types";
import { Briefcase, FileText, ListChecks, Target, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sel me — job hunt command center" },
      { name: "description", content: "Track applications, tailor your resume per job, and manage your career search in one place." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const jobs = useStore((s) => s.jobs);
  const resumes = useStore((s) => s.resumes);
  const openTodos = jobs.flatMap((j) => j.todos.filter((t) => !t.done).map((t) => ({ j, t })));
  const counts = JOB_STATUSES.map((s) => ({
    ...s,
    count: jobs.filter((j) => j.status === s.key).length,
  }));
  return (
    <AppShell>
      <div className="px-6 md:px-10 py-8 max-w-7xl mx-auto space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Mission control</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Every opportunity, every tailored resume, every next step — in one place.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="secondary">
              <Link to="/resumes">
                <FileText className="size-4" /> Resumes
              </Link>
            </Button>
            <Button asChild className="bg-gradient-primary">
              <Link to="/jobs">
                <Plus className="size-4" /> Add a job
              </Link>
            </Button>
          </div>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Open opportunities" value={jobs.length} icon={Briefcase} />
          <Stat label="Base resumes" value={resumes.length} icon={FileText} />
          <Stat label="Open to-dos" value={openTodos.length} icon={ListChecks} />
          <Stat
            label="Response rate"
            value={(() => {
              const applied = jobs.filter((j) =>
                ["applied", "screening", "interview", "offer", "rejected"].includes(j.status)
              ).length;
              const replied = jobs.filter((j) =>
                ["screening", "interview", "offer"].includes(j.status)
              ).length;
              return applied ? Math.round((replied / applied) * 100) : 0;
            })()}
            suffix="%"
            icon={Target}
          />
        </section>

        <section className="grid grid-cols-2 md:grid-cols-7 gap-3">
          {counts.map((c) => (
            <Link
              key={c.key}
              to="/jobs"
              className="glass rounded-xl p-4 hover:shadow-glow transition group"
            >
              <div className="text-2xl font-semibold">{c.count}</div>
              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                {c.label} <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition" />
              </div>
            </Link>
          ))}
        </section>

        <section className="grid md:grid-cols-2 gap-6">
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Recent jobs</h2>
              <Link to="/jobs" className="text-xs text-muted-foreground hover:text-foreground">
                View all →
              </Link>
            </div>
            {jobs.length === 0 ? (
              <Empty
                title="No jobs yet"
                hint="Add roles you're targeting to start tailoring resumes."
                cta={
                  <Button asChild>
                    <Link to="/jobs">Add a job</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-2">
                {jobs.slice(0, 6).map((j) => (
                  <li key={j.id}>
                    <Link
                      to="/jobs/$jobId"
                      params={{ jobId: j.id }}
                      className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-accent/40"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {j.title || "Untitled role"} —{" "}
                          <span className="text-muted-foreground">{j.company || "Company"}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {JOB_STATUSES.find((s) => s.key === j.status)?.label} ·{" "}
                          {new Date(j.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Next actions</h2>
              <span className="text-xs text-muted-foreground">{openTodos.length} open</span>
            </div>
            {openTodos.length === 0 ? (
              <Empty title="All clear" hint="Add to-dos inside a job's control panel." />
            ) : (
              <ul className="space-y-2">
                {openTodos.slice(0, 8).map(({ j, t }) => (
                  <li key={t.id}>
                    <Link
                      to="/jobs/$jobId"
                      params={{ jobId: j.id }}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent/40"
                    >
                      <span className="size-2 rounded-full bg-primary" />
                      <span className="text-sm truncate flex-1">{t.text}</span>
                      <span className="text-[11px] text-muted-foreground truncate max-w-[40%]">
                        {j.title || j.company}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  suffix,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  suffix?: string;
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="text-3xl font-semibold mt-2">
        {value}
        {suffix}
      </div>
    </div>
  );
}

function Empty({ title, hint, cta }: { title: string; hint: string; cta?: React.ReactNode }) {
  return (
    <div className="text-center py-8 text-muted-foreground">
      <div className="text-sm font-medium text-foreground">{title}</div>
      <div className="text-xs mt-1">{hint}</div>
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  );
}
