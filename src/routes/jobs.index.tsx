import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { JOB_STATUSES, type JobStatus, type Job } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, LayoutGrid, List, ExternalLink, Trash2, Search, Wand2, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { clipJob } from "@/lib/jd-clipper";
import { parseCsv, mapCsvRowToJob } from "@/lib/csv";

export const Route = createFileRoute("/jobs/")({
  head: () => ({ meta: [{ title: "Jobs — Sel me" }] }),
  component: JobsPage,
});

function JobsPage() {
  const jobs = useStore((s) => s.jobs);
  const setStatus = useStore((s) => s.setJobStatus);
  const deleteJob = useStore((s) => s.deleteJob);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return jobs;
    return jobs.filter((j) =>
      [j.title, j.company, j.location, j.notes, j.source].join(" ").toLowerCase().includes(t),
    );
  }, [jobs, q]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over) return;
    const jobId = String(e.active.id);
    const status = String(e.over.id) as JobStatus;
    if (JOB_STATUSES.some((s) => s.key === status)) setStatus(jobId, status);
  };

  return (
    <AppShell>
      <div className="px-6 md:px-10 py-8 max-w-[1600px] mx-auto space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Opportunities</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {jobs.length} role{jobs.length === 1 ? "" : "s"} mapped · drag between columns to update status.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search jobs" className="pl-9 w-56" />
            </div>
            <div className="rounded-lg border border-border p-1 flex">
              <button className={`px-2 py-1 rounded-md ${view === "kanban" ? "bg-accent" : ""}`} onClick={() => setView("kanban")}>
                <LayoutGrid className="size-4" />
              </button>
              <button className={`px-2 py-1 rounded-md ${view === "list" ? "bg-accent" : ""}`} onClick={() => setView("list")}>
                <List className="size-4" />
              </button>
            </div>
            <CsvImport />
            <ClipperDialog />
            <NewJobDialog />
          </div>
        </header>

        {jobs.length === 0 && (
          <div className="glass rounded-2xl p-10 text-center">
            <h2 className="text-lg font-medium">Map your first opportunity</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Paste a job description — we'll auto-extract title, company, location, salary and keywords.
            </p>
            <div className="mt-5 flex justify-center gap-2"><ClipperDialog /><NewJobDialog /></div>
          </div>
        )}

        {view === "kanban" && jobs.length > 0 && (
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
            <div className="grid grid-flow-col auto-cols-[280px] gap-4 overflow-x-auto pb-4">
              {JOB_STATUSES.map((col) => (
                <Column key={col.key} status={col.key} label={col.label} jobs={filtered.filter((j) => j.status === col.key)} />
              ))}
            </div>
          </DndContext>
        )}

        {view === "list" && jobs.length > 0 && (
          <div className="glass rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Title</th>
                  <th className="text-left px-4 py-3">Company</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Updated</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((j) => (
                  <tr key={j.id} className="border-t border-border hover:bg-accent/30">
                    <td className="px-4 py-3">
                      <Link to="/jobs/$jobId" params={{ jobId: j.id }} className="font-medium hover:underline">
                        {j.title || "Untitled"}
                      </Link>
                      {j.url && (
                        <a href={j.url} target="_blank" rel="noreferrer" className="ml-2 text-muted-foreground">
                          <ExternalLink className="size-3 inline" />
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{j.company}</td>
                    <td className="px-4 py-3">
                      <select
                        value={j.status}
                        onChange={(e) => setStatus(j.id, e.target.value as JobStatus)}
                        className="bg-input border border-border rounded px-2 py-1 text-xs"
                      >
                        {JOB_STATUSES.map((s) => (
                          <option key={s.key} value={s.key}>{s.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(j.updatedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          if (confirm("Delete this job?")) {
                            deleteJob(j.id);
                            toast.success("Job deleted");
                          }
                        }}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Column({ status, label, jobs }: { status: JobStatus; label: string; jobs: Job[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl border border-border bg-card/60 p-3 flex flex-col min-h-[60vh] ${
        isOver ? "ring-2 ring-primary" : ""
      }`}
    >
      <div className="flex items-center justify-between px-1 py-2">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <span className="text-xs text-muted-foreground">{jobs.length}</span>
      </div>
      <div className="space-y-2 flex-1">
        {jobs.map((j) => (
          <KanbanCard key={j.id} job={j} />
        ))}
      </div>
    </div>
  );
}

function KanbanCard({ job }: { job: Job }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: job.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`rounded-xl border border-border bg-background p-3 cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-60 shadow-glow" : ""
      }`}
    >
      <Link to="/jobs/$jobId" params={{ jobId: job.id }} className="block">
        <div className="text-sm font-medium truncate">{job.title || "Untitled role"}</div>
        <div className="text-xs text-muted-foreground truncate">{job.company || "—"}</div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="truncate">{job.location || ""}</span>
          <span>{job.todos.filter((t) => !t.done).length} to-dos</span>
        </div>
      </Link>
    </div>
  );
}

function NewJobDialog() {
  const addJob = useStore((s) => s.addJob);
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", company: "", location: "", url: "", source: "", salary: "", description: "",
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary"><Plus className="size-4" /> New job</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add a job opportunity</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <Field label="Role title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Company"><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></Field>
            <Field label="Location"><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
          </div>
          <Field label="Job URL"><Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Source"><Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} /></Field>
            <Field label="Salary"><Input value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} /></Field>
          </div>
          <Field label="Job description"><Textarea rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            className="bg-gradient-primary"
            onClick={() => {
              const id = addJob(form);
              setOpen(false);
              toast.success("Job added");
              nav({ to: "/jobs/$jobId", params: { jobId: id } });
            }}
          >
            Create & open
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ClipperDialog() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const addJob = useStore((s) => s.addJob);
  const nav = useNavigate();

  const onClip = () => {
    const clipped = clipJob(text);
    const id = addJob({ ...clipped, url });
    setOpen(false);
    setText("");
    setUrl("");
    toast.success(`Clipped — ${clipped.keywords.length} keywords found`);
    nav({ to: "/jobs/$jobId", params: { jobId: id } });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary"><Wand2 className="size-4" /> JD clipper</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Clip a job description</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <Field label="Job URL (optional)">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
          </Field>
          <Field label="Paste the full job description">
            <Textarea
              rows={14}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Copy the entire posting and paste it here. We'll extract title, company, location, salary and keywords."
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button className="bg-gradient-primary" onClick={onClip} disabled={!text.trim()}>
            Clip & open
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CsvImport() {
  const addJob = useStore((s) => s.addJob);
  const ref = useRef<HTMLInputElement>(null);
  const onFile = async (f: File) => {
    const text = await f.text();
    const rows = parseCsv(text);
    if (!rows.length) return toast.error("CSV is empty");
    let n = 0;
    for (const r of rows) {
      const mapped = mapCsvRowToJob(r);
      if (mapped.title || mapped.company) {
        addJob(mapped);
        n++;
      }
    }
    toast.success(`Imported ${n} job${n === 1 ? "" : "s"}`);
  };
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) await onFile(f);
          if (ref.current) ref.current.value = "";
        }}
      />
      <Button variant="secondary" onClick={() => ref.current?.click()}>
        <Upload className="size-4" /> CSV
      </Button>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
