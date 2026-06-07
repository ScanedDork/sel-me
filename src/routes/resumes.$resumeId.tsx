import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, FileDown, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { ResumeData } from "@/lib/types";
import { uid } from "@/lib/uid";
import { idbGet } from "@/lib/idb";
import { resumeOriginalKey } from "@/lib/idb";
import { exportEditedDocx, exportEditedPdf } from "@/lib/docx-export";
import { toast } from "sonner";

export const Route = createFileRoute("/resumes/$resumeId")({
  head: () => ({ meta: [{ title: "Edit resume — Sel me" }] }),
  component: ResumeEditor,
});

function ResumeEditor() {
  const { resumeId } = Route.useParams();
  const resume = useStore((s) => s.resumes.find((r) => r.id === resumeId));
  const updateResume = useStore((s) => s.updateResume);
  const updateResumeData = useStore((s) => s.updateResumeData);
  const [data, setData] = useState<ResumeData | undefined>(resume?.data);
  const [name, setName] = useState(resume?.name ?? "");

  if (!resume || !data) {
    return (
      <AppShell>
        <div className="px-6 md:px-10 py-8 max-w-3xl mx-auto">
          <p className="text-sm text-muted-foreground">Resume not found.</p>
          <Button asChild className="mt-4"><Link to="/resumes">Back</Link></Button>
        </div>
      </AppShell>
    );
  }

  const save = () => {
    updateResume(resume.id, { name });
    updateResumeData(resume.id, data);
    toast.success("Saved");
  };

  const onDownload = async (kind: "docx" | "pdf") => {
    if (!resume.hasOriginal) return toast.error("Original .docx missing — re-upload it.");
    const bytes = await idbGet<ArrayBuffer>(resumeOriginalKey(resume.id));
    if (!bytes) return toast.error("Original file missing");
    try {
      const fname = `${(data.name || name).replace(/\s+/g, "_") || "Resume"}`;
      if (kind === "docx") await exportEditedDocx(bytes, resume.data, data, fname);
      else await exportEditedPdf(bytes, resume.data, data, fname);
      toast.success(`${kind.toUpperCase()} downloaded`);
    } catch (e) {
      console.error(e);
      toast.error("Export failed");
    }
  };

  const upd = (patch: Partial<ResumeData>) => setData({ ...data, ...patch });

  return (
    <AppShell>
      <div className="px-6 md:px-10 py-6 max-w-5xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <Link to="/resumes" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="size-4" /> All resumes
          </Link>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => onDownload("pdf")}><FileDown className="size-4" /> PDF</Button>
            <Button variant="secondary" onClick={() => onDownload("docx")}><FileDown className="size-4" /> DOCX</Button>
            <Button onClick={save} className="bg-gradient-primary"><Save className="size-4" /> Save</Button>
          </div>
        </div>

        <div className="glass rounded-2xl p-4 grid md:grid-cols-3 gap-3">
          <Field label="Internal name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Full name on resume">
            <Input value={data.name} onChange={(e) => upd({ name: e.target.value })} />
          </Field>
          <Field label="Headline">
            <Input value={data.title} onChange={(e) => upd({ title: e.target.value })} />
          </Field>
          <div className="md:col-span-3">
            <Field label="Contact line">
              <Textarea rows={2} value={data.contact} onChange={(e) => upd({ contact: e.target.value })} />
            </Field>
          </div>
        </div>

        <div className="glass rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Summary</h3>
          <Textarea rows={5} value={data.summary} onChange={(e) => upd({ summary: e.target.value })} />
        </div>

        <div className="glass rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Skills</h3>
          <Textarea rows={6} value={data.skills} onChange={(e) => upd({ skills: e.target.value })} />
        </div>

        <ListSection
          title="Experience"
          items={data.experience}
          onChange={(experience) => upd({ experience })}
          create={() => ({ id: uid(), company: "", role: "", location: "", dates: "", bullets: [] })}
          renderItem={(e, set) => (
            <>
              <div className="grid md:grid-cols-2 gap-2">
                <Field label="Company"><Input value={e.company} onChange={(ev) => set({ ...e, company: ev.target.value })} /></Field>
                <Field label="Role"><Input value={e.role} onChange={(ev) => set({ ...e, role: ev.target.value })} /></Field>
                <Field label="Location"><Input value={e.location} onChange={(ev) => set({ ...e, location: ev.target.value })} /></Field>
                <Field label="Dates"><Input value={e.dates} onChange={(ev) => set({ ...e, dates: ev.target.value })} /></Field>
              </div>
              <BulletEditor bullets={e.bullets} onChange={(bullets) => set({ ...e, bullets })} />
            </>
          )}
        />

        <ListSection
          title="Education"
          items={data.education}
          onChange={(education) => upd({ education })}
          create={() => ({ id: uid(), institution: "", degree: "", location: "", dates: "", bullets: [] })}
          renderItem={(e, set) => (
            <>
              <div className="grid md:grid-cols-2 gap-2">
                <Field label="Institution"><Input value={e.institution} onChange={(ev) => set({ ...e, institution: ev.target.value })} /></Field>
                <Field label="Degree"><Input value={e.degree} onChange={(ev) => set({ ...e, degree: ev.target.value })} /></Field>
                <Field label="Location"><Input value={e.location} onChange={(ev) => set({ ...e, location: ev.target.value })} /></Field>
                <Field label="Dates"><Input value={e.dates} onChange={(ev) => set({ ...e, dates: ev.target.value })} /></Field>
              </div>
              <BulletEditor bullets={e.bullets} onChange={(bullets) => set({ ...e, bullets })} />
            </>
          )}
        />

        <ListSection
          title="Certifications"
          items={data.certifications}
          onChange={(certifications) => upd({ certifications })}
          create={() => ({ id: uid(), year: "", provider: "", title: "", details: "" })}
          renderItem={(c, set) => (
            <div className="grid md:grid-cols-2 gap-2">
              <Field label="Year"><Input value={c.year} onChange={(ev) => set({ ...c, year: ev.target.value })} /></Field>
              <Field label="Provider"><Input value={c.provider} onChange={(ev) => set({ ...c, provider: ev.target.value })} /></Field>
              <Field label="Title"><Input value={c.title} onChange={(ev) => set({ ...c, title: ev.target.value })} /></Field>
              <Field label="Details"><Input value={c.details} onChange={(ev) => set({ ...c, details: ev.target.value })} /></Field>
            </div>
          )}
        />

        <ListSection
          title="Leadership & Activities"
          items={data.leadership}
          onChange={(leadership) => upd({ leadership })}
          create={() => ({ id: uid(), org: "", role: "", dates: "", details: "" })}
          renderItem={(l, set) => (
            <div className="grid md:grid-cols-2 gap-2">
              <Field label="Org"><Input value={l.org} onChange={(ev) => set({ ...l, org: ev.target.value })} /></Field>
              <Field label="Role"><Input value={l.role} onChange={(ev) => set({ ...l, role: ev.target.value })} /></Field>
              <Field label="Dates"><Input value={l.dates} onChange={(ev) => set({ ...l, dates: ev.target.value })} /></Field>
              <Field label="Details"><Input value={l.details} onChange={(ev) => set({ ...l, details: ev.target.value })} /></Field>
            </div>
          )}
        />

        <ListSection
          title="Volunteer Experience"
          items={data.volunteer}
          onChange={(volunteer) => upd({ volunteer })}
          create={() => ({ id: uid(), year: "", title: "", details: "" })}
          renderItem={(v, set) => (
            <div className="grid md:grid-cols-3 gap-2">
              <Field label="Year"><Input value={v.year} onChange={(ev) => set({ ...v, year: ev.target.value })} /></Field>
              <Field label="Title"><Input value={v.title} onChange={(ev) => set({ ...v, title: ev.target.value })} /></Field>
              <Field label="Details"><Input value={v.details} onChange={(ev) => set({ ...v, details: ev.target.value })} /></Field>
            </div>
          )}
        />

        <div className="glass rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Personal</h3>
          <Textarea rows={4} value={data.personal} onChange={(e) => upd({ personal: e.target.value })} />
        </div>

        <div className="sticky bottom-4 flex justify-end">
          <Button onClick={save} className="bg-gradient-primary shadow-glow"><Save className="size-4" /> Save changes</Button>
        </div>
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

function BulletEditor({ bullets, onChange }: { bullets: string[]; onChange: (b: string[]) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">Bullets</Label>
      {bullets.map((b, i) => (
        <div key={i} className="flex gap-2">
          <Textarea
            rows={2}
            value={b}
            onChange={(e) => {
              const next = [...bullets];
              next[i] = e.target.value;
              onChange(next);
            }}
          />
          <button onClick={() => onChange(bullets.filter((_, k) => k !== i))} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={() => onChange([...bullets, ""])}>
        <Plus className="size-3" /> Add bullet
      </Button>
    </div>
  );
}

function ListSection<T extends { id: string }>({
  title, items, onChange, create, renderItem,
}: {
  title: string;
  items: T[];
  onChange: (items: T[]) => void;
  create: () => T;
  renderItem: (item: T, set: (next: T) => void) => React.ReactNode;
}) {
  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
        <Button size="sm" variant="ghost" onClick={() => onChange([...items, create()])}>
          <Plus className="size-3" /> Add
        </Button>
      </div>
      {items.length === 0 && <p className="text-sm text-muted-foreground">No entries.</p>}
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div key={item.id} className="rounded-xl border border-border p-3 space-y-2">
            {renderItem(item, (next) => {
              const arr = [...items];
              arr[idx] = next;
              onChange(arr);
            })}
            <div className="flex justify-end">
              <button
                onClick={() => onChange(items.filter((_, i) => i !== idx))}
                className="text-xs text-muted-foreground hover:text-destructive inline-flex items-center gap-1"
              >
                <Trash2 className="size-3" /> Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
