import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/prep")({
  head: () => ({ meta: [{ title: "Prep — Sel me" }] }),
  component: PrepPage,
});

function PrepPage() {
  return (
    <AppShell>
      <div className="px-6 md:px-10 py-8 max-w-6xl mx-auto space-y-6">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">Prep & learning</h1>
          <p className="text-sm text-muted-foreground mt-1">
            STAR stories, an interview question bank, and a learning plan — your career library.
          </p>
        </header>
        <Tabs defaultValue="star" className="w-full">
          <TabsList>
            <TabsTrigger value="star">STAR stories</TabsTrigger>
            <TabsTrigger value="qa">Question bank</TabsTrigger>
            <TabsTrigger value="learn">Learning plan</TabsTrigger>
          </TabsList>
          <TabsContent value="star" className="mt-4"><StarSection /></TabsContent>
          <TabsContent value="qa" className="mt-4"><QASection /></TabsContent>
          <TabsContent value="learn" className="mt-4"><LearnSection /></TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function StarSection() {
  const items = useStore((s) => s.starStories);
  const add = useStore((s) => s.addStar);
  const update = useStore((s) => s.updateStar);
  const del = useStore((s) => s.deleteStar);
  return (
    <div className="space-y-3">
      <Button
        onClick={() =>
          add({ title: "New story", situation: "", task: "", action: "", result: "", tags: "" })
        }
      >
        <Plus className="size-4" /> New STAR story
      </Button>
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">Capture impact stories you can reuse across interviews.</p>
      )}
      <div className="grid md:grid-cols-2 gap-3">
        {items.map((s) => (
          <div key={s.id} className="glass rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Input value={s.title} onChange={(e) => update(s.id, { title: e.target.value })} />
              <button className="text-muted-foreground hover:text-destructive" onClick={() => del(s.id)}>
                <Trash2 className="size-4" />
              </button>
            </div>
            <Input
              placeholder="Tags (e.g. leadership, conflict)"
              value={s.tags}
              onChange={(e) => update(s.id, { tags: e.target.value })}
            />
            {(["situation", "task", "action", "result"] as const).map((k) => (
              <Textarea
                key={k}
                placeholder={k[0].toUpperCase() + k.slice(1)}
                value={s[k]}
                onChange={(e) => update(s.id, { [k]: e.target.value })}
                rows={2}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function QASection() {
  const items = useStore((s) => s.interviewQuestions);
  const add = useStore((s) => s.addQuestion);
  const update = useStore((s) => s.updateQuestion);
  const del = useStore((s) => s.deleteQuestion);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Behavioral");
  return (
    <div className="space-y-3">
      <div className="glass rounded-2xl p-3 flex gap-2">
        <Input placeholder="Category" value={cat} onChange={(e) => setCat(e.target.value)} className="max-w-[180px]" />
        <Input placeholder="Add a question…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button
          onClick={() => {
            if (!q.trim()) return;
            add({ question: q, answer: "", category: cat });
            setQ("");
          }}
        >
          <Plus className="size-4" /> Add
        </Button>
      </div>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.id} className="glass rounded-2xl p-4">
            <div className="flex items-start gap-2">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">{it.category}</span>
              <Input
                className="flex-1"
                value={it.question}
                onChange={(e) => update(it.id, { question: e.target.value })}
              />
              <button className="text-muted-foreground hover:text-destructive" onClick={() => del(it.id)}>
                <Trash2 className="size-4" />
              </button>
            </div>
            <Textarea
              className="mt-2"
              placeholder="Your answer / talking points"
              value={it.answer}
              onChange={(e) => update(it.id, { answer: e.target.value })}
              rows={3}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function LearnSection() {
  const items = useStore((s) => s.learning);
  const add = useStore((s) => s.addLearning);
  const update = useStore((s) => s.updateLearning);
  const del = useStore((s) => s.deleteLearning);
  return (
    <div className="space-y-3">
      <Button
        onClick={() =>
          add({ title: "New item", type: "course", url: "", status: "todo", notes: "", progress: 0 })
        }
      >
        <Plus className="size-4" /> New learning item
      </Button>
      <div className="grid md:grid-cols-2 gap-3">
        {items.map((l) => (
          <div key={l.id} className="glass rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Input value={l.title} onChange={(e) => update(l.id, { title: e.target.value })} />
              <button className="text-muted-foreground hover:text-destructive" onClick={() => del(l.id)}>
                <Trash2 className="size-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <select
                className="bg-background border border-border rounded-md px-2 py-1 text-sm"
                value={l.type}
                onChange={(e) => update(l.id, { type: e.target.value as never })}
              >
                {["course", "book", "article", "skill", "project"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select
                className="bg-background border border-border rounded-md px-2 py-1 text-sm"
                value={l.status}
                onChange={(e) => update(l.id, { status: e.target.value as never })}
              >
                <option value="todo">To do</option>
                <option value="in_progress">In progress</option>
                <option value="done">Done</option>
              </select>
              <Input
                type="number"
                min={0}
                max={100}
                value={l.progress}
                onChange={(e) => update(l.id, { progress: Number(e.target.value) })}
                className="max-w-[90px]"
              />
            </div>
            <Input
              placeholder="URL"
              value={l.url}
              onChange={(e) => update(l.id, { url: e.target.value })}
            />
            {l.url && (
              <a href={l.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary">
                Open <ExternalLink className="size-3" />
              </a>
            )}
            <Textarea
              placeholder="Notes"
              value={l.notes}
              onChange={(e) => update(l.id, { notes: e.target.value })}
              rows={2}
            />
            <div className="h-1.5 bg-accent/40 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-primary" style={{ width: `${l.progress}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
