import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useStore } from "@/lib/store";
import {
  Briefcase,
  FileText,
  Plus,
  BarChart3,
  Calendar,
  Send,
  Settings,
  LayoutDashboard,
  GraduationCap,
} from "lucide-react";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const jobs = useStore((s) => s.jobs);
  const addJob = useStore((s) => s.addJob);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Jump to a job, page, or run a command…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() =>
              go(() => {
                const id = addJob({ title: "New role" });
                nav({ to: "/jobs/$jobId", params: { jobId: id } });
              })
            }
          >
            <Plus className="mr-2 size-4" /> New job
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => go(() => nav({ to: "/" }))}>
            <LayoutDashboard className="mr-2 size-4" /> Dashboard
          </CommandItem>
          <CommandItem onSelect={() => go(() => nav({ to: "/jobs" }))}>
            <Briefcase className="mr-2 size-4" /> Jobs
          </CommandItem>
          <CommandItem onSelect={() => go(() => nav({ to: "/resumes" }))}>
            <FileText className="mr-2 size-4" /> Resumes
          </CommandItem>
          <CommandItem onSelect={() => go(() => nav({ to: "/outreach" }))}>
            <Send className="mr-2 size-4" /> Outreach
          </CommandItem>
          <CommandItem onSelect={() => go(() => nav({ to: "/analytics" }))}>
            <BarChart3 className="mr-2 size-4" /> Pipeline
          </CommandItem>
          <CommandItem onSelect={() => go(() => nav({ to: "/calendar" }))}>
            <Calendar className="mr-2 size-4" /> Calendar
          </CommandItem>
          <CommandItem onSelect={() => go(() => nav({ to: "/prep" }))}>
            <GraduationCap className="mr-2 size-4" /> Prep & learning
          </CommandItem>
          <CommandItem onSelect={() => go(() => nav({ to: "/settings" }))}>
            <Settings className="mr-2 size-4" /> Settings
          </CommandItem>
        </CommandGroup>
        {jobs.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Jobs">
              {jobs.slice(0, 30).map((j) => (
                <CommandItem
                  key={j.id}
                  value={`${j.title} ${j.company}`}
                  onSelect={() => go(() => nav({ to: "/jobs/$jobId", params: { jobId: j.id } }))}
                >
                  <Briefcase className="mr-2 size-4" />
                  <span className="truncate">{j.title || "Untitled"}</span>
                  <span className="ml-2 text-xs text-muted-foreground truncate">{j.company}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
