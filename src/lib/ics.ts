import type { Job } from "./types";

function fmt(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function jobsToIcs(jobs: Job[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//jobs//EN",
    "CALSCALE:GREGORIAN",
  ];
  for (const j of jobs) {
    for (const r of j.rounds) {
      if (!r.scheduledAt) continue;
      const start = new Date(r.scheduledAt);
      if (isNaN(start.getTime())) continue;
      const end = new Date(start.getTime() + (r.durationMin || 45) * 60_000);
      lines.push(
        "BEGIN:VEVENT",
        `UID:${j.id}-${r.id}@jobs`,
        `DTSTAMP:${fmt(new Date())}`,
        `DTSTART:${fmt(start)}`,
        `DTEND:${fmt(end)}`,
        `SUMMARY:${escape(`${r.kind.replace("_", " ")} · ${j.company} (${j.title})`)}`,
        `LOCATION:${escape(r.location || "")}`,
        `DESCRIPTION:${escape(`Interviewers: ${r.interviewers}\\nJob: ${j.url}`)}`,
        "END:VEVENT",
      );
    }
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function escape(s: string) {
  return s.replace(/[\\,;]/g, (m) => "\\" + m).replace(/\n/g, "\\n");
}
