import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PROVIDER_PRESETS, pingProvider } from "@/lib/ai-providers";
import type { AIProvider, AIProviderKind, AppState } from "@/lib/types";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { encryptJson, decryptJson } from "@/lib/encrypt";
import FileSaver from "file-saver";
import { Plus, Trash2, CheckCircle2, Download, Upload, KeyRound, HardDrive, Github, Globe } from "lucide-react";
import { loadStorageConfig, saveStorageConfig, type StorageMode } from "@/lib/storage-adapter";
const { saveAs } = FileSaver;

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — jobs" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <AppShell>
      <div className="px-6 md:px-10 py-8 max-w-5xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connect AI providers, set weekly goals, and back up your data with an encrypted export.
          </p>
        </header>
        <Providers />
        <StorageSettings />
        <Goals />
        <CoverLetterDefault />
        <Backup />
        <About />
      </div>
    </AppShell>
  );
}

/* ---------- Storage ---------- */
function StorageSettings() {
  const [cfg, setCfg] = useState(() => (typeof window === "undefined" ? { mode: "localStorage" as StorageMode } : loadStorageConfig()));
  const apply = () => {
    saveStorageConfig(cfg);
    toast.success("Storage updated. Reloading…");
    setTimeout(() => window.location.reload(), 500);
  };
  return (
    <section className="glass rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <HardDrive className="size-4 text-muted-foreground" />
        <h2 className="font-semibold">Data &amp; storage</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Choose where this app keeps your data. You can run it fully offline, in volatile memory, or sync to your own self-hosted server.
        See <code>docs/self-hosted-server.md</code> in the repo for a ~30-line reference server.
      </p>
      <div className="grid md:grid-cols-3 gap-2">
        {([
          { key: "memory", label: "Browser memory", hint: "Volatile. Cleared on reload." },
          { key: "localStorage", label: "This browser", hint: "Default. Persists locally." },
          { key: "remote", label: "Remote server", hint: "Self-hosted REST endpoint." },
        ] as { key: StorageMode; label: string; hint: string }[]).map((opt) => (
          <button
            key={opt.key}
            onClick={() => setCfg({ ...cfg, mode: opt.key })}
            className={`text-left rounded-xl border p-3 transition ${cfg.mode === opt.key ? "border-primary bg-accent/40" : "border-border hover:bg-accent/30"}`}
          >
            <div className="text-sm font-medium">{opt.label}</div>
            <div className="text-[11px] text-muted-foreground mt-1">{opt.hint}</div>
          </button>
        ))}
      </div>
      {cfg.mode === "remote" && (
        <div className="grid md:grid-cols-2 gap-2">
          <Field label="Server URL">
            <Input
              value={cfg.remoteUrl ?? ""}
              onChange={(e) => setCfg({ ...cfg, remoteUrl: e.target.value })}
              placeholder="https://my-server.example.com/state"
            />
          </Field>
          <Field label="Bearer token (optional)">
            <Input
              type="password"
              value={cfg.remoteToken ?? ""}
              onChange={(e) => setCfg({ ...cfg, remoteToken: e.target.value })}
              placeholder="leave blank if your server is open"
            />
          </Field>
        </div>
      )}
      <div>
        <Button onClick={apply}>Save &amp; reload</Button>
      </div>
    </section>
  );
}

/* ---------- About ---------- */
function About() {
  return (
    <section className="glass rounded-2xl p-5 space-y-3">
      <h2 className="font-semibold">About</h2>
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">jobs</span> is free, open source, and MIT licensed. Run it locally,
        self-host it, or fork it — your data never leaves the destinations you configure.
      </p>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-muted-foreground">Built by</span>
        <span className="font-medium">Ramar Ranjeet Skanda</span>
        <a
          href="https://github.com/ScanedDork"
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1.5 text-foreground hover:text-primary"
        >
          <Github className="size-4" /> ScanedDork
        </a>
        <a
          href="https://ranjeetskanda.com"
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1.5 text-foreground hover:text-primary"
        >
          <Globe className="size-4" /> ranjeetskanda.com
        </a>
      </div>
    </section>
  );
}

/* ---------- AI providers ---------- */
function Providers() {
  const providers = useStore((s) => s.settings.providers);
  const active = useStore((s) => s.settings.activeProviderId);
  const addProvider = useStore((s) => s.addProvider);
  const updateProvider = useStore((s) => s.updateProvider);
  const deleteProvider = useStore((s) => s.deleteProvider);
  const updateSettings = useStore((s) => s.updateSettings);
  const [kind, setKind] = useState<AIProviderKind>("openai");

  const add = () => {
    const preset = PROVIDER_PRESETS[kind];
    addProvider({
      name: preset.label,
      kind,
      baseUrl: preset.baseUrl,
      model: preset.model,
      apiKey: "",
    });
  };

  return (
    <section className="glass rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">AI providers</h2>
          <p className="text-xs text-muted-foreground">
            Bring your own key. Calls go directly from this browser to the provider you choose — nothing routes through us.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as AIProviderKind)}
            className="bg-input border border-border rounded-md px-2 py-1.5 text-sm"
          >
            {Object.entries(PROVIDER_PRESETS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <Button onClick={add}><Plus className="size-4" /> Add</Button>
        </div>
      </div>

      {providers.length === 0 && (
        <div className="text-sm text-muted-foreground text-center py-6">
          No provider configured yet. Add OpenAI, Anthropic, Ollama, LM Studio, or any OpenAI-compatible endpoint.
        </div>
      )}

      <div className="space-y-3">
        {providers.map((p) => (
          <ProviderRow
            key={p.id}
            p={p}
            isActive={p.id === active}
            onActivate={() => updateSettings({ activeProviderId: p.id })}
            onChange={(patch) => updateProvider(p.id, patch)}
            onDelete={() => deleteProvider(p.id)}
          />
        ))}
      </div>
    </section>
  );
}

function ProviderRow({
  p, isActive, onActivate, onChange, onDelete,
}: {
  p: AIProvider;
  isActive: boolean;
  onActivate: () => void;
  onChange: (patch: Partial<AIProvider>) => void;
  onDelete: () => void;
}) {
  const [testing, setTesting] = useState(false);
  const test = async () => {
    setTesting(true);
    try {
      const out = await pingProvider(p);
      toast.success(`Connected — ${out.slice(0, 40) || "ok"}`);
    } catch (e) {
      toast.error(`Failed: ${(e as Error).message}`);
    } finally {
      setTesting(false);
    }
  };
  return (
    <div className={`rounded-xl border p-3 space-y-2 ${isActive ? "border-primary" : "border-border"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onActivate}
            title="Use as default"
            className={`size-5 rounded-full grid place-items-center border ${isActive ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}
          >
            {isActive && <CheckCircle2 className="size-3.5" />}
          </button>
          <span className="text-sm font-medium">{PROVIDER_PRESETS[p.kind].label}</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={test} disabled={testing}>
            {testing ? "Testing…" : "Test"}
          </Button>
          <button onClick={onDelete} className="text-muted-foreground hover:text-destructive p-2">
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-2">
        <Field label="Name">
          <Input value={p.name} onChange={(e) => onChange({ name: e.target.value })} />
        </Field>
        <Field label="Base URL">
          <Input value={p.baseUrl} onChange={(e) => onChange({ baseUrl: e.target.value })} />
        </Field>
        <Field label="Model">
          <Input value={p.model} onChange={(e) => onChange({ model: e.target.value })} />
        </Field>
        <Field label="API key">
          <div className="relative">
            <KeyRound className="size-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="password"
              value={p.apiKey}
              onChange={(e) => onChange({ apiKey: e.target.value })}
              placeholder={PROVIDER_PRESETS[p.kind].needsKey ? "Required" : "Not required"}
              className="pl-7"
            />
          </div>
        </Field>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Local providers (Ollama, LM Studio) must be running and reachable from this page. If you see CORS errors, enable CORS in the local server.
      </p>
    </div>
  );
}

/* ---------- Weekly goals ---------- */
function Goals() {
  const goals = useStore((s) => s.settings.weeklyGoals);
  const reminders = useStore((s) => s.settings.reminderDaysAfterApply);
  const updateSettings = useStore((s) => s.updateSettings);
  return (
    <section className="glass rounded-2xl p-5 space-y-4">
      <h2 className="font-semibold">Weekly activity & follow-ups</h2>
      <div className="grid md:grid-cols-3 gap-3">
        <Field label="Applications / week">
          <Input
            type="number"
            value={goals.applications}
            onChange={(e) => updateSettings({ weeklyGoals: { ...goals, applications: Number(e.target.value) || 0 } })}
          />
        </Field>
        <Field label="Outreach touches / week">
          <Input
            type="number"
            value={goals.outreach}
            onChange={(e) => updateSettings({ weeklyGoals: { ...goals, outreach: Number(e.target.value) || 0 } })}
          />
        </Field>
        <Field label="Follow-up reminders (days after applied)">
          <Input
            value={reminders.join(", ")}
            onChange={(e) =>
              updateSettings({
                reminderDaysAfterApply: e.target.value
                  .split(",")
                  .map((n) => Number(n.trim()))
                  .filter((n) => Number.isFinite(n) && n > 0),
              })
            }
            placeholder="3, 7, 14"
          />
        </Field>
      </div>
    </section>
  );
}

/* ---------- Cover letter default ---------- */
function CoverLetterDefault() {
  const tpl = useStore((s) => s.settings.coverLetterTemplate);
  const updateSettings = useStore((s) => s.updateSettings);
  return (
    <section className="glass rounded-2xl p-5 space-y-3">
      <div>
        <h2 className="font-semibold">Default cover letter template</h2>
        <p className="text-xs text-muted-foreground">
          Use merge fields like <code>{`{{role}}`}</code>, <code>{`{{company}}`}</code>, <code>{`{{my_name}}`}</code>, <code>{`{{top_skill}}`}</code>, <code>{`{{achievement_1}}`}</code>.
        </p>
      </div>
      <Textarea rows={12} value={tpl} onChange={(e) => updateSettings({ coverLetterTemplate: e.target.value })} />
    </section>
  );
}

/* ---------- Backup ---------- */
function Backup() {
  const state = useStore.getState;
  const importState = useStore((s) => s.importState);
  const fileRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState("");

  const onExport = async () => {
    if (!password) return toast.error("Set a password to encrypt your export.");
    const snapshot: AppState = {
      resumes: state().resumes,
      activeResumeId: state().activeResumeId,
      jobs: state().jobs,
      starStories: state().starStories,
      interviewQuestions: state().interviewQuestions,
      learning: state().learning,
      settings: state().settings,
    };
    const payload = await encryptJson(snapshot, password);
    saveAs(new Blob([payload], { type: "application/json" }), `jobs-backup-${Date.now()}.enc.json`);
    toast.success("Encrypted backup downloaded");
  };

  const onImport = async (f: File) => {
    if (!password) return toast.error("Enter the password used at export.");
    const text = await f.text();
    try {
      const data = await decryptJson<AppState>(text, password);
      importState(data);
      toast.success("Imported. Reloading…");
      setTimeout(() => window.location.reload(), 500);
    } catch {
      toast.error("Decryption failed. Check the password.");
    }
  };

  return (
    <section className="glass rounded-2xl p-5 space-y-3">
      <div>
        <h2 className="font-semibold">Encrypted export / import</h2>
        <p className="text-xs text-muted-foreground">
          AES-256-GCM with PBKDF2. The file is unreadable without your password. Doesn't include attachments (those stay in this browser).
        </p>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="max-w-xs"
        />
        <Button onClick={onExport}><Download className="size-4" /> Export</Button>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) await onImport(f);
            if (fileRef.current) fileRef.current.value = "";
          }}
        />
        <Button variant="secondary" onClick={() => fileRef.current?.click()}>
          <Upload className="size-4" /> Import
        </Button>
      </div>
    </section>
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
