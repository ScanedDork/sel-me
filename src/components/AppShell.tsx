import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  GraduationCap,
  Send,
  BarChart3,
  Calendar,
  Settings,
} from "lucide-react";
import type { ReactNode } from "react";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/jobs", label: "Jobs", icon: Briefcase },
  { to: "/resumes", label: "Resumes", icon: FileText },
  { to: "/outreach", label: "Outreach", icon: Send },
  { to: "/analytics", label: "Pipeline", icon: BarChart3 },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/prep", label: "Prep & learning", icon: GraduationCap },
  { to: "/settings", label: "Settings", icon: Settings },
];

function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="1.75" y="1.75" width="20.5" height="20.5" rx="6" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6 16 L10.5 11.5 L13.5 14.5 L18.5 9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 8.5 H19 V12.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));
  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar backdrop-blur-xl">
        <div className="px-5 py-5 flex items-center gap-2.5">
          <div className="text-foreground">
            <Logo />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">Sel me</div>
            <div className="text-[11px] text-muted-foreground">Land the role.</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-2 space-y-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                isActive(to)
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
              }`}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-4 space-y-2 text-[11px] text-muted-foreground">
          <div>
            Press <kbd className="px-1.5 py-0.5 rounded border border-border bg-card">⌘K</kbd> to jump anywhere
          </div>
          <div className="border-t border-sidebar-border pt-2">
            Open source · MIT ·{" "}
            <a href="https://github.com/ScanedDork" target="_blank" rel="noreferrer noopener" className="hover:text-foreground underline-offset-2 hover:underline">
              ScanedDork
            </a>
          </div>
          <div>
            <a href="https://ranjeetskanda.com" target="_blank" rel="noreferrer noopener" className="hover:text-foreground underline-offset-2 hover:underline">
              ranjeetskanda.com
            </a>
          </div>
        </div>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
