import mammoth from "mammoth/mammoth.browser";
import type {
  ResumeData,
  ExperienceItem,
  EducationItem,
  CertificationItem,
  LeadershipItem,
  VolunteerItem,
} from "./types";
import { uid } from "./uid";

export async function parseResumeDocx(file: ArrayBuffer): Promise<{
  data: ResumeData;
  rawText: string;
}> {
  const result = await mammoth.extractRawText({ arrayBuffer: file });
  const raw = result.value;
  const data = parseResumeText(raw);
  return { data, rawText: raw };
}

export function parseResumeText(raw: string): ResumeData {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const sectionIdx: Record<string, number> = {};
  const sectionNames = [
    "SUMMARY",
    "SKILLS",
    "EXPERIENCE",
    "EDUCATION",
    "CERTIFICATION",
    "CERTIFICATIONS",
    "LEADERSHIP & ACTIVITIES",
    "LEADERSHIP",
    "VOLUNTEER EXPERIENCE",
    "VOLUNTEER",
    "PERSONAL",
  ];
  lines.forEach((l, i) => {
    const upper = l.toUpperCase().replace(/[^A-Z& ]/g, "").trim();
    if (sectionNames.includes(upper) && sectionIdx[upper] === undefined) {
      sectionIdx[upper] = i;
    }
  });

  const get = (name: string) => sectionIdx[name];
  const nextAfter = (i: number) => {
    const idxs = Object.values(sectionIdx)
      .filter((x) => x > i)
      .sort((a, b) => a - b);
    return idxs[0] ?? lines.length;
  };
  const sliceSection = (name: string) => {
    const i = get(name);
    if (i === undefined) return [] as string[];
    return lines.slice(i + 1, nextAfter(i));
  };

  // Header (before first known section)
  const firstSection = Math.min(
    ...Object.values(sectionIdx).filter((v) => v !== undefined),
    lines.length
  );
  const header = lines.slice(0, firstSection);
  const name = header[0] ?? "";
  const title = header[1] ?? "";
  const contact = header.slice(2).join(" | ");

  const summary = sliceSection("SUMMARY").join(" ").trim();
  const skills = sliceSection("SKILLS").join(" ").trim();

  const expLines = sliceSection("EXPERIENCE");
  const experience = parseExperience(expLines);

  const eduLines =
    sliceSection("EDUCATION").length > 0
      ? sliceSection("EDUCATION")
      : extractEducationFromLeadership(sliceSection("LEADERSHIP & ACTIVITIES"));
  const education = parseEducation(eduLines);

  const certLines =
    sliceSection("CERTIFICATION").length > 0
      ? sliceSection("CERTIFICATION")
      : sliceSection("CERTIFICATIONS");
  const certifications = parseCertifications(certLines);

  const leadLines =
    sliceSection("LEADERSHIP & ACTIVITIES").length > 0
      ? sliceSection("LEADERSHIP & ACTIVITIES")
      : sliceSection("LEADERSHIP");
  const leadership = parseLeadership(leadLines);

  const volLines =
    sliceSection("VOLUNTEER EXPERIENCE").length > 0
      ? sliceSection("VOLUNTEER EXPERIENCE")
      : sliceSection("VOLUNTEER");
  const volunteer = parseVolunteer(volLines);

  const personal = sliceSection("PERSONAL").join("\n").trim();

  return {
    name,
    title,
    contact,
    summary,
    skills,
    experience,
    education,
    certifications,
    leadership,
    volunteer,
    personal,
  };
}

// Heuristic: experience entries are blocks of 4 header lines (company, role, location, dates) then bullets starting with "-"
function parseExperience(lines: string[]): ExperienceItem[] {
  const items: ExperienceItem[] = [];
  let i = 0;
  while (i < lines.length) {
    // collect header lines until we hit a bullet or next ALL CAPS block
    const isBullet = (s: string) => /^[-•]/.test(s);
    if (isBullet(lines[i])) {
      i++;
      continue;
    }
    const headerLines: string[] = [];
    while (i < lines.length && !isBullet(lines[i]) && headerLines.length < 6) {
      headerLines.push(lines[i]);
      i++;
      // peek: if next line is bullet, stop
      if (i < lines.length && isBullet(lines[i])) break;
      // if header lines reached 4 and there's a non-bullet still, treat as new item start
      if (headerLines.length >= 4) break;
    }
    const bullets: string[] = [];
    while (i < lines.length && isBullet(lines[i])) {
      bullets.push(lines[i].replace(/^[-•]\s*/, ""));
      i++;
    }
    // If next non-bullet line exists but no bullets gathered, treat as paragraph bullet
    if (bullets.length === 0 && i < lines.length && !isBullet(lines[i])) {
      // grab one paragraph line
      bullets.push(lines[i]);
      i++;
    }

    const [company = "", role = "", location = "", dates = ""] = headerLines;
    if (company || role || bullets.length) {
      items.push({
        id: uid(),
        company,
        role,
        location,
        dates,
        bullets,
      });
    }
  }
  return items;
}

function extractEducationFromLeadership(lines: string[]): string[] {
  // Fallback for resumes where Education isn't its own section
  const out: string[] = [];
  const eduRegex = /(M\.Tech|B\.E|M\.S|B\.S|B\.A|Ph\.D|Bachelor|Master|University|Institute|College)/i;
  for (const l of lines) {
    if (eduRegex.test(l)) out.push(l);
  }
  return out;
}

function parseEducation(lines: string[]): EducationItem[] {
  const items: EducationItem[] = [];
  let i = 0;
  while (i < lines.length) {
    const headerLines: string[] = [];
    while (i < lines.length && !/^[-•]/.test(lines[i]) && headerLines.length < 4) {
      headerLines.push(lines[i]);
      i++;
    }
    const bullets: string[] = [];
    while (i < lines.length && /^[-•]/.test(lines[i])) {
      bullets.push(lines[i].replace(/^[-•]\s*/, ""));
      i++;
    }
    const [institution = "", degree = "", location = "", dates = ""] = headerLines;
    if (institution || degree)
      items.push({
        id: uid(),
        institution,
        degree,
        location,
        dates,
        bullets,
      });
  }
  return items;
}

function parseCertifications(lines: string[]): CertificationItem[] {
  const items: CertificationItem[] = [];
  let i = 0;
  while (i < lines.length) {
    const yearMatch = lines[i].match(/^(19|20)\d{2}/);
    const year = yearMatch ? lines[i] : "";
    if (year) i++;
    const provider = lines[i] ?? "";
    i++;
    const title = lines[i] ?? "";
    i++;
    const details = lines[i] && !/^(19|20)\d{2}/.test(lines[i]) ? lines[i] : "";
    if (details) i++;
    if (provider || title) {
      items.push({ id: uid(), year, provider, title, details });
    }
    if (!year && !provider && !title) i++;
  }
  return items;
}

function parseLeadership(lines: string[]): LeadershipItem[] {
  const items: LeadershipItem[] = [];
  for (const l of lines) {
    const m = l.match(/^((?:19|20)\d{2}(?:\s*-\s*(?:19|20)\d{2})?)\s+(.*)/);
    if (m) {
      items.push({
        id: uid(),
        org: "",
        role: m[2],
        dates: m[1],
        details: "",
      });
    } else {
      items.push({ id: uid(), org: l, role: "", dates: "", details: "" });
    }
  }
  return items;
}

function parseVolunteer(lines: string[]): VolunteerItem[] {
  const items: VolunteerItem[] = [];
  let i = 0;
  while (i < lines.length) {
    const m = lines[i].match(/^((?:19|20)\d{2}(?:\s*-\s*(?:19|20)\d{2})?)\s+(.*)/);
    if (m) {
      const year = m[1];
      const title = m[2];
      const details = lines[i + 1] && !/^((?:19|20)\d{2})/.test(lines[i + 1])
        ? lines[i + 1]
        : "";
      items.push({ id: uid(), year, title, details });
      i += details ? 2 : 1;
    } else {
      i++;
    }
  }
  return items;
}

export function emptyResume(): ResumeData {
  return {
    name: "",
    title: "",
    contact: "",
    summary: "",
    skills: "",
    experience: [],
    education: [],
    certifications: [],
    leadership: [],
    volunteer: [],
    personal: "",
  };
}
