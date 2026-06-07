import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { OutreachTemplate } from "@/lib/types";

export const Route = createFileRoute("/outreach")({
  head: () => ({ meta: [{ title: "Outreach — jobs" }] }),
  component: OutreachPage,
});

function applyMerge(s: string, ctx: Record<string, string>) {
  return s.replace(/\{\{\s*([^}|]+?)(?:\s*\|\s*([^}]+))?\s*\}\}/g, (_, key: string, fallback?: string) => {
    const v = ctx[key.trim()];
    return v && v.trim() ? v : (fallback ?? "").trim();
  });
}

function OutreachPage() {
  const templates = useStore((s) => s.settings.outreach);
  const addOutreach = useStore((s) => s.addOutreach);
  const updateOutreach = useStore((s) => s.updateOutreach);
  const deleteOutreach = useStore((s) => s.deleteOutreach);
  const jobs = useStore((s) => s.jobs);
  const resumes = useStore((s) => s.resumes);
  const activeResume = resumes.find((r) => r.id === useStore.getState().activeResumeId) ?? resumes[0];

  const [jobId, setJobId] = useState<string>("");
  const [first, setFirst] = useState("");
  const job = jobs.find((j) => j.id === jobId);

  const ctx: Record<string, string> = {
    role: job?.title ?? "",
    company: job?.company ?? "",
    first_name: first,
    my_name: activeResume?.data.name ?? "",
    top_skill: (activeResume?.data.skills || "").split(/[,;\n]/)[0]?.trim() ?? "",
    achievement_1: (activeResume?.data.experience?.[0]?.bullets?.[0] ?? "").replace(/^[-•*]\s*/, ""),
    team_or_outcome: "",
  };

  return (
    <AppShell>
      <div className="px-6 md:px-10 py-8 max-w-6xl mx-auto space-y-6">
        <header className="flex justify-between items-end flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Outreach studio</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Cold emails, LinkedIn DMs, and follow-ups with per-job merge fields.
            </p>
          </div>
          <Button
            onClick={() =>
              addOutreach({ name: "New template", channel: "email", subject: "", body: "" })
            }
          >
            <Plus className="size-4" /> New template
          </Button>
        </header>

        <section className="glass rounded-2xl p-5 grid md:grid-cols-3 gap-3">
          <Field label="Target job">
            <select
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              className="bg-input border border-border rounded-md px-2 py-2 text-sm"
            >
              <option value="">Pick a job for merge fields…</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>{j.title || "Untitled"} — {j.company}</option>
              ))}
            </select>
          </Field>
          <Field label="Recipient first name">
            <Input value={first} onChange={(e) => setFirst(e.target.value)} placeholder="e.g. Alex" />
          </Field>
          <div className="text-xs text-muted-foreground self-end">
            Merge keys: <code>{`{{role}}`}</code>, <code>{`{{company}}`}</code>, <code>{`{{first_name}}`}</code>, <code>{`{{my_name}}`}</code>, <code>{`{{top_skill}}`}</code>, <code>{`{{achievement_1}}`}</code>
          </div>
        </section>

        <div className="grid md:grid-cols-2 gap-4">
          {templates.map((t) => (
            <TemplateCard
              key={t.id}
              t={t}
              ctx={ctx}
              onChange={(p) => updateOutreach(t.id, p)}
              onDelete={() => deleteOutreach(t.id)}
            />
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function TemplateCard({
  t, ctx, onChange, onDelete,
}: {
  t: OutreachTemplate;
  ctx: Record<string, string>;
  onChange: (p: Partial<OutreachTemplate>) => void;
  onDelete: () => void;
}) {
  const subjectOut = applyMerge(t.subject, ctx);
  const bodyOut = applyMerge(t.body, ctx);
  return (
    <div className="glass rounded-2xl p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Input value={t.name} onChange={(e) => onChange({ name: e.target.value })} className="font-medium" />
        <select
          value={t.channel}
          onChange={(e) => onChange({ channel: e.target.value as OutreachTemplate["channel"] })}
          className="bg-input border border-border rounded-md px-2 py-1.5 text-xs"
        >
          <option value="email">Email</option>
          <option value="linkedin">LinkedIn</option>
          <option value="followup">Follow-up</option>
        </select>
        <button onClick={onDelete} className="text-muted-foreground hover:text-destructive p-2">
          <Trash2 className="size-4" />
        </button>
      </div>
      {t.channel !== "linkedin" && (
        <Input
          value={t.subject}
          onChange={(e) => onChange({ subject: e.target.value })}
          placeholder="Subject"
        />
      )}
      <Textarea
        rows={6}
        value={t.body}
        onChange={(e) => onChange({ body: e.target.value })}
        placeholder="Body — use merge fields"
      />
      <div className="rounded-lg border border-border bg-card/60 p-3 text-sm">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Preview</div>
        {t.channel !== "linkedin" && subjectOut && (
          <div className="font-medium mb-1">{subjectOut}</div>
        )}
        <pre className="whitespace-pre-wrap font-sans text-sm">{bodyOut}</pre>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            navigator.clipboard.writeText(
              (subjectOut ? `Subject: ${subjectOut}\n\n` : "") + bodyOut,
            );
            toast.success("Copied");
          }}
        >
          <Copy className="size-4" /> Copy
        </Button>
      </div>
    </div>
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
