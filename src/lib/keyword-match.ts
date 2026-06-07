import type { ResumeData } from "./types";

export function resumeText(r: ResumeData): string {
  const exp = r.experience.map((e) => `${e.role} ${e.company} ${e.bullets.join(" ")}`).join(" ");
  const edu = r.education.map((e) => `${e.degree} ${e.institution} ${e.bullets.join(" ")}`).join(" ");
  const cert = r.certifications.map((c) => `${c.title} ${c.provider} ${c.details}`).join(" ");
  return [r.title, r.summary, r.skills, exp, edu, cert].join(" ").toLowerCase();
}

export function matchKeywords(keywords: string[], r: ResumeData) {
  const text = resumeText(r);
  const present: string[] = [];
  const missing: string[] = [];
  for (const k of keywords) {
    if (text.includes(k.toLowerCase())) present.push(k);
    else missing.push(k);
  }
  const score = keywords.length ? Math.round((present.length / keywords.length) * 100) : 0;
  return { score, present, missing };
}
