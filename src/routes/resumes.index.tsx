import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Trash2, CheckCircle2, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { idbDel, idbSet, resumeOriginalKey } from "@/lib/idb";
import { parseResumeDocx } from "@/lib/resume-parser";
import { toast } from "sonner";

export const Route = createFileRoute("/resumes/")({
  head: () => ({ meta: [{ title: "Resumes — Sel me" }] }),
  component: ResumesPage,
});

function ResumesPage() {
  const resumes = useStore((s) => s.resumes);
  const activeId = useStore((s) => s.activeResumeId);
  const addResume = useStore((s) => s.addResume);
  const deleteResume = useStore((s) => s.deleteResume);
  const setActive = useStore((s) => s.setActiveResume);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onUpload = async (file: File) => {
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const { data } = await parseResumeDocx(buf);
      const id = addResume(file.name.replace(/\.docx$/i, "") || "Base resume", data, true);
      await idbSet(resumeOriginalKey(id), buf);
      toast.success("Resume parsed and stored");
    } catch (e) {
      console.error(e);
      toast.error("Couldn't parse .docx — make sure it's a Word file");
    } finally {
      setBusy(false);
    }
  };

  const onLoadSample = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}sample-resume.docx`);
      const buf = await res.arrayBuffer();
      const { data } = await parseResumeDocx(buf);
      const id = addResume("Sample resume", data, true);
      await idbSet(resumeOriginalKey(id), buf);
      toast.success("Sample resume loaded");
    } catch {
      toast.error("Couldn't load sample");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="px-6 md:px-10 py-8 max-w-5xl mx-auto space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Base resumes</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Upload .docx resumes. Each job tailors a copy without touching the original layout.
            </p>
          </div>
          <div className="flex gap-2">
            {resumes.length === 0 && (
              <Button variant="secondary" onClick={onLoadSample} disabled={busy}>
                <Sparkles className="size-4" /> Load uploaded sample
              </Button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) await onUpload(f);
                if (fileRef.current) fileRef.current.value = "";
              }}
            />
            <Button className="bg-gradient-primary" onClick={() => fileRef.current?.click()} disabled={busy}>
              <Upload className="size-4" /> {busy ? "Working…" : "Upload .docx"}
            </Button>
          </div>
        </header>

        {resumes.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center">
            <FileText className="size-10 mx-auto text-muted-foreground" />
            <h2 className="mt-3 font-medium">No base resume yet</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Upload a Word .docx — we parse all your sections so you can tailor each one per job,
              and download a Word/PDF version with the exact original layout.
            </p>
          </div>
        ) : (
          <ul className="grid md:grid-cols-2 gap-3">
            {resumes.map((r) => (
              <li key={r.id} className="glass rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link to="/resumes/$resumeId" params={{ resumeId: r.id }} className="flex-1 min-w-0">
                    <div className="font-medium truncate">{r.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {r.data.experience.length} exp · {r.data.education.length} edu · {r.data.certifications.length} certs
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      Added {new Date(r.createdAt).toLocaleDateString()}
                    </div>
                  </Link>
                  <div className="flex flex-col items-end gap-1">
                    <button
                      onClick={() => setActive(r.id)}
                      className={`text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded-full border ${
                        activeId === r.id ? "border-primary text-primary" : "border-border text-muted-foreground"
                      }`}
                    >
                      <CheckCircle2 className="size-3" /> {activeId === r.id ? "Default" : "Make default"}
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm("Delete this base resume?")) {
                          await idbDel(resumeOriginalKey(r.id));
                          deleteResume(r.id);
                          toast.success("Deleted");
                        }
                      }}
                      className="text-muted-foreground hover:text-destructive p-1"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
