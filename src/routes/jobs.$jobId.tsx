import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore, getEffectiveResume } from "@/lib/store";
import { JOB_STATUSES, type JobStatus, type InterviewRound, type OfferDetail } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, ExternalLink, Trash2, Plus, FileDown, FileText, Paperclip, RotateCcw, Save, Upload,
  Sparkles, Mail, Calendar as CalendarIcon, DollarSign, Target, Copy, Wand2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { idbDel, idbGet, idbSet, attachmentKey, resumeOriginalKey } from "@/lib/idb";
import { exportEditedDocx, exportEditedPdf, exportTextDocx, exportTextPdf } from "@/lib/docx-export";
import { uid } from "@/lib/uid";
import { toast } from "sonner";
import FileSaver from "file-saver";
import { matchKeywords } from "@/lib/keyword-match";
import { extractKeywords } from "@/lib/jd-clipper";
import { chatComplete } from "@/lib/ai-providers";
const { saveAs } = FileSaver;

export const Route = createFileRoute("/jobs/$jobId")({
  head: () => ({ meta: [{ title: "Job — Sel me" }] }),
  component: JobDetail,
});

function JobDetail() {
  const { jobId } = Route.useParams();
  const nav = useNavigate();
  const job = useStore((s) => s.jobs.find((j) => j.id === jobId));
  const resumes = useStore((s) => s.resumes);
  const activeResumeId = useStore((s) => s.activeResumeId);
  const updateJob = useStore((s) => s.updateJob);
  const deleteJob = useStore((s) => s.deleteJob);

  if (!job) {
    return (
      <AppShell>
        <div className="px-6 md:px-10 py-8 max-w-3xl mx-auto">
          <p className="text-sm text-muted-foreground">Job not found.</p>
          <Button asChild className="mt-4"><Link to="/jobs">Back to jobs</Link></Button>
        </div>
      </AppShell>
    );
  }

  const baseId = job.baseResumeId ?? activeResumeId ?? resumes[0]?.id;

  return (
    <AppShell>
      <div className="px-6 md:px-10 py-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/jobs" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="size-4" /> All jobs
          </Link>
          <button
            onClick={() => {
              if (confirm("Delete this job?")) {
                job.attachments.forEach((a) => idbDel(attachmentKey(job.id, a.id)));
                deleteJob(job.id);
                toast.success("Deleted");
                nav({ to: "/jobs" });
              }
            }}
            className="text-xs text-muted-foreground hover:text-destructive inline-flex items-center gap-1"
          >
            <Trash2 className="size-3.5" /> Delete job
          </button>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Role title"><Input value={job.title} onChange={(e) => updateJob(job.id, { title: e.target.value })} /></Field>
            <Field label="Company"><Input value={job.company} onChange={(e) => updateJob(job.id, { company: e.target.value })} /></Field>
            <Field label="Location"><Input value={job.location} onChange={(e) => updateJob(job.id, { location: e.target.value })} /></Field>
            <Field label="Source"><Input value={job.source} onChange={(e) => updateJob(job.id, { source: e.target.value })} /></Field>
            <Field label="Salary"><Input value={job.salary} onChange={(e) => updateJob(job.id, { salary: e.target.value })} /></Field>
            <Field label="URL">
              <div className="flex gap-2">
                <Input value={job.url} onChange={(e) => updateJob(job.id, { url: e.target.value })} />
                {job.url && (
                  <a href={job.url} target="_blank" rel="noreferrer" className="grid place-items-center px-2 rounded-md border border-border">
                    <ExternalLink className="size-4" />
                  </a>
                )}
              </div>
            </Field>
            <Field label="Posted date"><Input type="date" value={job.postedDate} onChange={(e) => updateJob(job.id, { postedDate: e.target.value })} /></Field>
            <Field label="Applied date"><Input type="date" value={job.appliedDate} onChange={(e) => updateJob(job.id, { appliedDate: e.target.value })} /></Field>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Label className="text-xs text-muted-foreground">Status</Label>
            {JOB_STATUSES.map((s) => (
              <button
                key={s.key}
                onClick={() => updateJob(job.id, { status: s.key as JobStatus })}
                className={`px-2.5 py-1 rounded-full text-xs border ${
                  job.status === s.key
                    ? "bg-gradient-primary text-primary-foreground border-transparent"
                    : "border-border text-muted-foreground hover:bg-accent/40"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <Tabs defaultValue="resume" className="w-full">
          <TabsList className="bg-card/60 flex-wrap h-auto">
            <TabsTrigger value="resume"><FileText className="size-4 mr-1" /> Resume tailor</TabsTrigger>
            <TabsTrigger value="match"><Target className="size-4 mr-1" /> Match</TabsTrigger>
            <TabsTrigger value="cover"><Mail className="size-4 mr-1" /> Cover letter</TabsTrigger>
            <TabsTrigger value="interview"><CalendarIcon className="size-4 mr-1" /> Interview</TabsTrigger>
            <TabsTrigger value="offer"><DollarSign className="size-4 mr-1" /> Offer</TabsTrigger>
            <TabsTrigger value="todos">To-dos</TabsTrigger>
            <TabsTrigger value="attachments"><Paperclip className="size-4 mr-1" /> Files</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="resume" className="mt-4"><ResumeTailor jobId={job.id} baseResumeId={baseId} /></TabsContent>
          <TabsContent value="match" className="mt-4"><MatchPanel jobId={job.id} baseResumeId={baseId} /></TabsContent>
          <TabsContent value="cover" className="mt-4"><CoverLetter jobId={job.id} baseResumeId={baseId} /></TabsContent>
          <TabsContent value="interview" className="mt-4"><Interview jobId={job.id} /></TabsContent>
          <TabsContent value="offer" className="mt-4"><OfferMatrix jobId={job.id} /></TabsContent>
          <TabsContent value="todos" className="mt-4"><TodoList jobId={job.id} /></TabsContent>
          <TabsContent value="attachments" className="mt-4"><Attachments jobId={job.id} /></TabsContent>
          <TabsContent value="notes" className="mt-4"><NotesPane jobId={job.id} /></TabsContent>
        </Tabs>
      </div>
    </AppShell>
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

/* ---------- Resume tailor ---------- */
function ResumeTailor({ jobId, baseResumeId }: { jobId: string; baseResumeId?: string }) {
  const resumes = useStore((s) => s.resumes);
  const job = useStore((s) => s.jobs.find((j) => j.id === jobId)!);
  const updateJob = useStore((s) => s.updateJob);
  const setOverride = useStore((s) => s.setOverride);
  const clearOverride = useStore((s) => s.clearOverride);
  const providers = useStore((s) => s.settings.providers);
  const activeProviderId = useStore((s) => s.settings.activeProviderId);
  const [aiBusy, setAiBusy] = useState(false);

  const base = resumes.find((r) => r.id === (job.baseResumeId ?? baseResumeId));
  const effective = useMemo(
    () => (base ? getEffectiveResume(base.data, job.resumeOverrides) : null),
    [base, job.resumeOverrides],
  );
  if (!base || !effective) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <h3 className="font-medium">No resume yet</h3>
        <p className="text-sm text-muted-foreground mt-1">Upload a base resume to start tailoring it per job.</p>
        <Button asChild className="mt-4 bg-gradient-primary"><Link to="/resumes">Upload resume</Link></Button>
      </div>
    );
  }

  const ov = (path: string) => job.resumeOverrides[path] !== undefined;
  const val = (path: string, original: string) =>
    job.resumeOverrides[path] !== undefined ? job.resumeOverrides[path] : original;
  const handleSet = (path: string, originalVal: string, v: string) => {
    if (v === originalVal) clearOverride(jobId, path);
    else setOverride(jobId, path, v);
  };

  const onDownload = async (kind: "docx" | "pdf") => {
    if (!base.hasOriginal) return toast.error("Original .docx not stored. Re-upload the base resume.");
    const bytes = await idbGet<ArrayBuffer>(resumeOriginalKey(base.id));
    if (!bytes) return toast.error("Couldn't load original file.");
    const fname = `${(effective.name || "Resume").replace(/\s+/g, "_")}_${(job.company || "Tailored").replace(/\s+/g, "_")}`;
    try {
      if (kind === "docx") await exportEditedDocx(bytes, base.data, effective, fname);
      else await exportEditedPdf(bytes, base.data, effective, fname);
      toast.success(`${kind.toUpperCase()} downloaded`);
    } catch (e) { console.error(e); toast.error("Export failed"); }
  };

  const tailorWithAi = async () => {
    const provider = providers.find((p) => p.id === activeProviderId) ?? providers[0];
    if (!provider) {
      toast.error("Add an AI provider in Settings first.");
      return;
    }
    if (!job.description.trim()) {
      toast.error("Paste the job description first (use the Notes tab or JD clipper).");
      return;
    }
    setAiBusy(true);
    try {
      const system =
        "You rewrite resume sections to better match a target job. Keep the meaning truthful, preserve names/dates/employers. Be concise, use strong action verbs, integrate relevant keywords naturally. Return ONLY a JSON object — no markdown.";
      const user = JSON.stringify({
        instruction:
          "Rewrite the summary, skills, and the top 4 experience bullets so they better target this job. Do not invent new employers. Reply with JSON: { summary: string, skills: string, bullets: { experienceId: string, index: number, text: string }[] }",
        job: { title: job.title, company: job.company, description: job.description },
        resume: {
          summary: effective.summary,
          skills: effective.skills,
          experience: effective.experience.slice(0, 4).map((e) => ({
            id: e.id, role: e.role, company: e.company, bullets: e.bullets,
          })),
        },
      });
      const raw = await chatComplete(provider, system, user);
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Model didn't return JSON");
      const parsed = JSON.parse(jsonMatch[0]);
      if (typeof parsed.summary === "string") setOverride(jobId, "summary", parsed.summary);
      if (typeof parsed.skills === "string") setOverride(jobId, "skills", parsed.skills);
      if (Array.isArray(parsed.bullets)) {
        for (const b of parsed.bullets) {
          if (b?.experienceId && Number.isFinite(b.index) && typeof b.text === "string") {
            setOverride(jobId, `experience.${b.experienceId}.bullets.${b.index}`, b.text);
          }
        }
      }
      toast.success("Tailored — review the highlighted fields");
    } catch (e) {
      console.error(e);
      toast.error(`AI tailor failed: ${(e as Error).message}`);
    } finally { setAiBusy(false); }
  };

  return (
    <div className="space-y-5">
      <div className="glass rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Label className="text-xs text-muted-foreground">Base resume</Label>
          <select
            value={base.id}
            onChange={(e) => updateJob(jobId, { baseResumeId: e.target.value })}
            className="bg-input border border-border rounded-md px-2 py-1 text-sm"
          >
            {resumes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" onClick={tailorWithAi} disabled={aiBusy}>
            <Sparkles className="size-4" /> {aiBusy ? "Tailoring…" : "AI tailor"}
          </Button>
          <Button variant="secondary" onClick={() => onDownload("pdf")}><FileDown className="size-4" /> PDF</Button>
          <Button className="bg-gradient-primary" onClick={() => onDownload("docx")}><FileDown className="size-4" /> DOCX</Button>
        </div>
      </div>

      <Section title="Header">
        <EditableField label="Name" value={val("name", base.data.name)} original={base.data.name} overridden={ov("name")} onChange={(v) => handleSet("name", base.data.name, v)} />
        <EditableField label="Headline" value={val("title", base.data.title)} original={base.data.title} overridden={ov("title")} onChange={(v) => handleSet("title", base.data.title, v)} />
        <EditableField label="Contact" value={val("contact", base.data.contact)} original={base.data.contact} overridden={ov("contact")} onChange={(v) => handleSet("contact", base.data.contact, v)} multiline />
      </Section>

      <Section title="Summary">
        <EditableField label="Professional summary" value={val("summary", base.data.summary)} original={base.data.summary} overridden={ov("summary")} onChange={(v) => handleSet("summary", base.data.summary, v)} multiline rows={5} />
      </Section>

      <Section title="Skills">
        <EditableField label="Skills" value={val("skills", base.data.skills)} original={base.data.skills} overridden={ov("skills")} onChange={(v) => handleSet("skills", base.data.skills, v)} multiline rows={5} />
      </Section>

      <Section title="Experience">
        {base.data.experience.map((e) => (
          <div key={e.id} className="rounded-xl border border-border p-3 space-y-2">
            <div className="grid md:grid-cols-2 gap-2">
              <EditableField compact label="Company" value={val(`experience.${e.id}.company`, e.company)} original={e.company} overridden={ov(`experience.${e.id}.company`)} onChange={(v) => handleSet(`experience.${e.id}.company`, e.company, v)} />
              <EditableField compact label="Role" value={val(`experience.${e.id}.role`, e.role)} original={e.role} overridden={ov(`experience.${e.id}.role`)} onChange={(v) => handleSet(`experience.${e.id}.role`, e.role, v)} />
              <EditableField compact label="Location" value={val(`experience.${e.id}.location`, e.location)} original={e.location} overridden={ov(`experience.${e.id}.location`)} onChange={(v) => handleSet(`experience.${e.id}.location`, e.location, v)} />
              <EditableField compact label="Dates" value={val(`experience.${e.id}.dates`, e.dates)} original={e.dates} overridden={ov(`experience.${e.id}.dates`)} onChange={(v) => handleSet(`experience.${e.id}.dates`, e.dates, v)} />
            </div>
            <div className="space-y-1.5">
              {e.bullets.map((b, i) => (
                <EditableField key={i} multiline rows={2} label={`Bullet ${i + 1}`} value={val(`experience.${e.id}.bullets.${i}`, b)} original={b} overridden={ov(`experience.${e.id}.bullets.${i}`)} onChange={(v) => handleSet(`experience.${e.id}.bullets.${i}`, b, v)} />
              ))}
            </div>
          </div>
        ))}
      </Section>

      <Section title="Personal">
        <EditableField label="Personal" value={val("personal", base.data.personal)} original={base.data.personal} overridden={ov("personal")} onChange={(v) => handleSet("personal", base.data.personal, v)} multiline rows={4} />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function EditableField({
  label, value, original, overridden, onChange, multiline, rows = 3, compact,
}: {
  label: string;
  value: string;
  original: string;
  overridden: boolean;
  onChange: (v: string) => void;
  multiline?: boolean;
  rows?: number;
  compact?: boolean;
}) {
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between">
        <Label className={`text-[11px] uppercase tracking-wider ${overridden ? "text-primary" : "text-muted-foreground"}`}>
          {label} {overridden && <span className="ml-1">· edited</span>}
        </Label>
        {overridden && (
          <button onClick={() => onChange(original)} className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <RotateCcw className="size-3" /> reset
          </button>
        )}
      </div>
      {multiline ? (
        <Textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} className={overridden ? "border-primary/60" : ""} />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} className={`${overridden ? "border-primary/60" : ""} ${compact ? "h-9" : ""}`} />
      )}
    </div>
  );
}

/* ---------- Match panel ---------- */
function MatchPanel({ jobId, baseResumeId }: { jobId: string; baseResumeId?: string }) {
  const job = useStore((s) => s.jobs.find((j) => j.id === jobId)!);
  const resumes = useStore((s) => s.resumes);
  const updateJob = useStore((s) => s.updateJob);
  const base = resumes.find((r) => r.id === (job.baseResumeId ?? baseResumeId));
  const effective = base ? getEffectiveResume(base.data, job.resumeOverrides) : null;
  const keywords = useMemo(
    () => (job.keywords?.length ? job.keywords : extractKeywords(job.description || "")),
    [job.keywords, job.description],
  );

  const result = useMemo(() => (effective ? matchKeywords(keywords, effective) : null), [keywords, effective]);

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Keyword match</h3>
            <p className="text-xs text-muted-foreground">Based on the JD's keywords vs your tailored resume.</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-semibold tabular-nums">{result?.score ?? 0}%</div>
            <div className="text-[11px] text-muted-foreground">{result?.present.length ?? 0}/{keywords.length} keywords</div>
          </div>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-gradient-primary" style={{ width: `${result?.score ?? 0}%` }} />
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            const k = extractKeywords(job.description || "");
            updateJob(jobId, { keywords: k });
            toast.success(`Re-extracted ${k.length} keywords`);
          }}
        >
          <Wand2 className="size-4" /> Re-extract from JD
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-4">
          <h4 className="text-sm font-semibold mb-2 text-success">Present in resume</h4>
          <div className="flex flex-wrap gap-1.5">
            {(result?.present ?? []).map((k) => (
              <span key={k} className="text-xs px-2 py-1 rounded-full bg-success/15 text-success">{k}</span>
            ))}
            {!result?.present.length && <span className="text-xs text-muted-foreground">None yet.</span>}
          </div>
        </div>
        <div className="glass rounded-2xl p-4">
          <h4 className="text-sm font-semibold mb-2 text-warning">Missing — consider adding</h4>
          <div className="flex flex-wrap gap-1.5">
            {(result?.missing ?? []).map((k) => (
              <span key={k} className="text-xs px-2 py-1 rounded-full bg-warning/15 text-warning">{k}</span>
            ))}
            {!result?.missing.length && <span className="text-xs text-muted-foreground">All set.</span>}
          </div>
        </div>
      </div>

      {!job.description && (
        <p className="text-sm text-muted-foreground text-center">
          Paste the job description on the Notes tab (or use the JD clipper) to get a more accurate score.
        </p>
      )}
    </div>
  );
}

/* ---------- Cover letter ---------- */
function applyMerge(s: string, ctx: Record<string, string>) {
  return s.replace(/\{\{\s*([^}|]+?)(?:\s*\|\s*([^}]+))?\s*\}\}/g, (_, key: string, fallback?: string) => {
    const v = ctx[key.trim()];
    return v && v.trim() ? v : (fallback ?? "").trim();
  });
}

function CoverLetter({ jobId, baseResumeId }: { jobId: string; baseResumeId?: string }) {
  const job = useStore((s) => s.jobs.find((j) => j.id === jobId)!);
  const resumes = useStore((s) => s.resumes);
  const updateJob = useStore((s) => s.updateJob);
  const defaultTpl = useStore((s) => s.settings.coverLetterTemplate);
  const base = resumes.find((r) => r.id === (job.baseResumeId ?? baseResumeId));
  const effective = base ? getEffectiveResume(base.data, job.resumeOverrides) : null;

  const ctx: Record<string, string> = {
    role: job.title, company: job.company,
    my_name: effective?.name ?? "",
    top_skill: (effective?.skills || "").split(/[,;\n]/)[0]?.trim() ?? "",
    achievement_1: (effective?.experience?.[0]?.bullets?.[0] ?? "").replace(/^[-•*]\s*/, ""),
    achievement_2: (effective?.experience?.[0]?.bullets?.[1] ?? "").replace(/^[-•*]\s*/, ""),
    achievement_3: (effective?.experience?.[0]?.bullets?.[2] ?? "").replace(/^[-•*]\s*/, ""),
    why_company: "",
    team_or_outcome: "",
    hiring_manager: "",
  };

  const tpl = job.coverLetter || defaultTpl;
  const rendered = applyMerge(tpl, ctx);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="glass rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Template</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => updateJob(jobId, { coverLetter: defaultTpl })}>
              Reset to default
            </Button>
            <Button size="sm" variant="secondary" onClick={() => updateJob(jobId, { coverLetter: tpl })}>
              <Save className="size-4" /> Save
            </Button>
          </div>
        </div>
        <Textarea
          rows={20}
          value={tpl}
          onChange={(e) => updateJob(jobId, { coverLetter: e.target.value })}
          className="font-mono text-xs"
        />
      </div>
      <div className="glass rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Preview</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(rendered); toast.success("Copied"); }}>
              <Copy className="size-4" /> Copy
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => saveAs(new Blob([rendered], { type: "text/plain;charset=utf-8" }), `Cover_${(job.company || "Letter").replace(/\s+/g, "_")}.txt`)}
            >
              <FileDown className="size-4" /> .txt
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                try {
                  await exportTextPdf(rendered, `Cover_${(job.company || "Letter").replace(/\s+/g, "_")}.pdf`);
                } catch (e) { toast.error((e as Error).message); }
              }}
            >
              <FileDown className="size-4" /> PDF
            </Button>
            <Button
              size="sm"
              className="bg-gradient-primary"
              onClick={async () => {
                try {
                  await exportTextDocx(rendered, `Cover_${(job.company || "Letter").replace(/\s+/g, "_")}.docx`);
                } catch (e) { toast.error((e as Error).message); }
              }}
            >
              <FileDown className="size-4" /> DOCX
            </Button>
          </div>
        </div>
        <pre className="whitespace-pre-wrap font-sans text-sm border border-border rounded-lg p-3 bg-card/60 min-h-[28rem]">
          {rendered}
        </pre>
      </div>
    </div>
  );
}

/* ---------- Interview ---------- */
function Interview({ jobId }: { jobId: string }) {
  const job = useStore((s) => s.jobs.find((j) => j.id === jobId)!);
  const addRound = useStore((s) => s.addRound);
  const updateRound = useStore((s) => s.updateRound);
  const deleteRound = useStore((s) => s.deleteRound);
  const stars = useStore((s) => s.starStories);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Rounds</h3>
        <Button onClick={() => addRound(jobId)}><Plus className="size-4" /> Add round</Button>
      </div>
      {job.rounds.length === 0 && (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
          No rounds scheduled. Add one — recruiter call, hiring manager, technical, panel, final.
        </div>
      )}
      {job.rounds.map((r) => (
        <RoundCard
          key={r.id}
          r={r}
          stars={stars}
          onChange={(p) => updateRound(jobId, r.id, p)}
          onDelete={() => deleteRound(jobId, r.id)}
        />
      ))}
    </div>
  );
}

function RoundCard({
  r, stars, onChange, onDelete,
}: {
  r: InterviewRound;
  stars: { id: string; title: string }[];
  onChange: (p: Partial<InterviewRound>) => void;
  onDelete: () => void;
}) {
  const [task, setTask] = useState("");
  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="grid md:grid-cols-4 gap-2">
        <Field label="Round">
          <select
            value={r.kind}
            onChange={(e) => onChange({ kind: e.target.value as InterviewRound["kind"] })}
            className="bg-input border border-border rounded-md px-2 py-2 text-sm"
          >
            <option value="recruiter">Recruiter</option>
            <option value="hiring_manager">Hiring manager</option>
            <option value="technical">Technical</option>
            <option value="panel">Panel</option>
            <option value="final">Final</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="When">
          <Input type="datetime-local" value={r.scheduledAt ?? ""} onChange={(e) => onChange({ scheduledAt: e.target.value })} />
        </Field>
        <Field label="Duration (min)">
          <Input type="number" value={r.durationMin ?? 45} onChange={(e) => onChange({ durationMin: Number(e.target.value) || 0 })} />
        </Field>
        <Field label="Location / link">
          <Input value={r.location} onChange={(e) => onChange({ location: e.target.value })} />
        </Field>
        <Field label="Interviewers">
          <Input value={r.interviewers} onChange={(e) => onChange({ interviewers: e.target.value })} placeholder="Names, roles" />
        </Field>
        <div className="md:col-span-3 flex items-end justify-end gap-2">
          <label className="text-xs flex items-center gap-1">
            <input type="checkbox" checked={r.done} onChange={(e) => onChange({ done: e.target.checked })} /> done
          </label>
          <button onClick={onDelete} className="text-muted-foreground hover:text-destructive p-2">
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Prep checklist</Label>
          <form
            className="flex gap-2 mt-1"
            onSubmit={(e) => {
              e.preventDefault();
              if (!task.trim()) return;
              onChange({ prepChecklist: [...r.prepChecklist, { id: uid(), text: task.trim(), done: false }] });
              setTask("");
            }}
          >
            <Input value={task} onChange={(e) => setTask(e.target.value)} placeholder="e.g. Read CEO interview…" />
            <Button type="submit"><Plus className="size-4" /></Button>
          </form>
          <ul className="mt-2 space-y-1">
            {r.prepChecklist.map((c) => (
              <li key={c.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={c.done}
                  onChange={() =>
                    onChange({ prepChecklist: r.prepChecklist.map((x) => (x.id === c.id ? { ...x, done: !c.done } : x)) })
                  }
                />
                <span className={c.done ? "line-through text-muted-foreground" : ""}>{c.text}</span>
                <button
                  className="ml-auto text-muted-foreground hover:text-destructive"
                  onClick={() => onChange({ prepChecklist: r.prepChecklist.filter((x) => x.id !== c.id) })}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Linked STAR stories</Label>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {stars.length === 0 && <span className="text-xs text-muted-foreground">Add stories in Prep & learning.</span>}
            {stars.map((s) => {
              const on = r.linkedStarIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() =>
                    onChange({
                      linkedStarIds: on
                        ? r.linkedStarIds.filter((x) => x !== s.id)
                        : [...r.linkedStarIds, s.id],
                    })
                  }
                  className={`text-xs px-2 py-1 rounded-full border ${on ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}
                >
                  {s.title || "Untitled story"}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <Field label="Questions asked">
          <Textarea rows={4} value={r.questionsAsked} onChange={(e) => onChange({ questionsAsked: e.target.value })} />
        </Field>
        <Field label="Debrief">
          <Textarea rows={4} value={r.debrief} onChange={(e) => onChange({ debrief: e.target.value })} />
        </Field>
        <Field label="Thank-you note">
          <Textarea rows={4} value={r.thankYou} onChange={(e) => onChange({ thankYou: e.target.value })} />
        </Field>
      </div>
    </div>
  );
}

/* ---------- Offer ---------- */
function OfferMatrix({ jobId }: { jobId: string }) {
  const job = useStore((s) => s.jobs.find((j) => j.id === jobId)!);
  const setOffer = useStore((s) => s.setOffer);
  const offer: OfferDetail = job.offer ?? {
    base: 0, bonus: 0, equity: 0, signOn: 0, benefits: "", startDate: "", colIndex: 1, notes: "",
  };
  const total = offer.base + offer.bonus + offer.equity / 4 + offer.signOn / 4;
  const colAdjusted = offer.colIndex > 0 ? total / offer.colIndex : total;

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div className="grid md:grid-cols-4 gap-3">
        <Field label="Base salary"><Input type="number" value={offer.base} onChange={(e) => setOffer(jobId, { ...offer, base: Number(e.target.value) || 0 })} /></Field>
        <Field label="Annual bonus"><Input type="number" value={offer.bonus} onChange={(e) => setOffer(jobId, { ...offer, bonus: Number(e.target.value) || 0 })} /></Field>
        <Field label="Equity (4-yr total)"><Input type="number" value={offer.equity} onChange={(e) => setOffer(jobId, { ...offer, equity: Number(e.target.value) || 0 })} /></Field>
        <Field label="Sign-on (paid over 4 yrs)"><Input type="number" value={offer.signOn} onChange={(e) => setOffer(jobId, { ...offer, signOn: Number(e.target.value) || 0 })} /></Field>
        <Field label="Start date"><Input type="date" value={offer.startDate} onChange={(e) => setOffer(jobId, { ...offer, startDate: e.target.value })} /></Field>
        <Field label="COL index (1 = baseline)"><Input type="number" step="0.01" value={offer.colIndex} onChange={(e) => setOffer(jobId, { ...offer, colIndex: Number(e.target.value) || 1 })} /></Field>
        <Field label="Benefits"><Input value={offer.benefits} onChange={(e) => setOffer(jobId, { ...offer, benefits: e.target.value })} placeholder="Health, 401k, PTO…" /></Field>
        <Field label="Notes / negotiation script"><Input value={offer.notes} onChange={(e) => setOffer(jobId, { ...offer, notes: e.target.value })} /></Field>
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        <Summary label="Yearly total (yr-1)" value={total} />
        <Summary label="COL-adjusted" value={Math.round(colAdjusted)} />
        <div className="rounded-xl border border-border p-3">
          <div className="text-xs text-muted-foreground">Total =</div>
          <div className="text-xs">base + bonus + equity/4 + signOn/4</div>
        </div>
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="text-2xl font-semibold mt-1 tabular-nums">{value.toLocaleString()}</div>
    </div>
  );
}

/* ---------- To-dos ---------- */
function TodoList({ jobId }: { jobId: string }) {
  const job = useStore((s) => s.jobs.find((j) => j.id === jobId)!);
  const addTodo = useStore((s) => s.addTodo);
  const toggleTodo = useStore((s) => s.toggleTodo);
  const deleteTodo = useStore((s) => s.deleteTodo);
  const updateTodo = useStore((s) => s.updateTodo);
  const [text, setText] = useState("");

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <form onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; addTodo(jobId, text.trim()); setText(""); }} className="flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Email recruiter, prep STAR stories…" />
        <Button type="submit"><Plus className="size-4" /> Add</Button>
      </form>
      <ul className="space-y-1.5">
        {job.todos.length === 0 && <li className="text-sm text-muted-foreground text-center py-6">No to-dos yet.</li>}
        {job.todos.map((t) => (
          <li key={t.id} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent/40 group">
            <input type="checkbox" checked={t.done} onChange={() => toggleTodo(jobId, t.id)} className="size-4 accent-primary" />
            <input
              defaultValue={t.text}
              onBlur={(e) => updateTodo(jobId, t.id, { text: e.target.value })}
              className={`flex-1 bg-transparent outline-none text-sm ${t.done ? "line-through text-muted-foreground" : ""}`}
            />
            <input
              type="date"
              value={t.dueDate ?? ""}
              onChange={(e) => updateTodo(jobId, t.id, { dueDate: e.target.value })}
              className="text-xs bg-transparent text-muted-foreground border border-border rounded px-1.5 py-0.5"
            />
            <button onClick={() => deleteTodo(jobId, t.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Attachments ---------- */
function Attachments({ jobId }: { jobId: string }) {
  const job = useStore((s) => s.jobs.find((j) => j.id === jobId)!);
  const addAttachmentMeta = useStore((s) => s.addAttachmentMeta);
  const deleteAttachmentMeta = useStore((s) => s.deleteAttachmentMeta);
  const fileRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<"cover_letter" | "supporting" | "other">("supporting");

  const onUpload = async (f: File) => {
    const id = uid();
    const buf = await f.arrayBuffer();
    await idbSet(attachmentKey(jobId, id), buf);
    addAttachmentMeta(jobId, { id, name: f.name, kind, mime: f.type, size: f.size, addedAt: Date.now() });
    toast.success(`Attached ${f.name}`);
  };
  const onDownload = async (id: string, name: string, mime: string) => {
    const buf = await idbGet<ArrayBuffer>(attachmentKey(jobId, id));
    if (!buf) return toast.error("File missing");
    saveAs(new Blob([buf], { type: mime || "application/octet-stream" }), name);
  };
  const onDelete = async (id: string) => { await idbDel(attachmentKey(jobId, id)); deleteAttachmentMeta(jobId, id); };

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className="bg-input border border-border rounded-md px-2 py-1.5 text-sm">
          <option value="cover_letter">Cover letter</option>
          <option value="supporting">Supporting document</option>
          <option value="other">Other</option>
        </select>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={async (e) => { const f = e.target.files?.[0]; if (f) await onUpload(f); if (fileRef.current) fileRef.current.value = ""; }}
        />
        <Button onClick={() => fileRef.current?.click()} className="bg-gradient-primary"><Upload className="size-4" /> Attach file</Button>
        <span className="text-xs text-muted-foreground">Files are stored locally in this browser.</span>
      </div>
      <ul className="divide-y divide-border">
        {job.attachments.length === 0 && <li className="text-sm text-muted-foreground py-6 text-center">No attachments yet.</li>}
        {job.attachments.map((a) => (
          <li key={a.id} className="flex items-center gap-3 py-2">
            <Paperclip className="size-4 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{a.name}</div>
              <div className="text-[11px] text-muted-foreground">{a.kind.replace("_", " ")} · {(a.size / 1024).toFixed(1)} KB · {new Date(a.addedAt).toLocaleDateString()}</div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onDownload(a.id, a.name, a.mime)}><FileDown className="size-4" /></Button>
            <button onClick={() => onDelete(a.id)} className="text-muted-foreground hover:text-destructive p-2"><Trash2 className="size-4" /></button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Notes ---------- */
function NotesPane({ jobId }: { jobId: string }) {
  const job = useStore((s) => s.jobs.find((j) => j.id === jobId)!);
  const updateJob = useStore((s) => s.updateJob);
  const [notes, setNotes] = useState(job.notes);
  const [desc, setDesc] = useState(job.description);
  useEffect(() => { setNotes(job.notes); setDesc(job.description); }, [jobId]); // eslint-disable-line
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="glass rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Job description</h3>
          <Button size="sm" variant="ghost" onClick={() => { updateJob(jobId, { description: desc, keywords: extractKeywords(desc) }); toast.success("Saved"); }}>
            <Save className="size-4" /> Save
          </Button>
        </div>
        <Textarea rows={16} value={desc} onChange={(e) => setDesc(e.target.value)} />
      </div>
      <div className="glass rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Personal notes</h3>
          <Button size="sm" variant="ghost" onClick={() => { updateJob(jobId, { notes }); toast.success("Saved"); }}>
            <Save className="size-4" /> Save
          </Button>
        </div>
        <Textarea rows={16} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Recruiter conversations, interview prep, decision criteria…" />
      </div>
    </div>
  );
}
