// Heuristic parser for raw job-description text.
export interface ClippedJob {
  title: string;
  company: string;
  location: string;
  salary: string;
  description: string;
  keywords: string[];
}

const TITLE_HINTS = /(engineer|developer|designer|manager|analyst|scientist|architect|lead|director|consultant|specialist|coordinator|product|marketing|sales|recruiter|owner|head)/i;

export function clipJob(text: string): ClippedJob {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let title = "", company = "", location = "", salary = "";

  // Title: first short line that looks like a title
  for (const l of lines.slice(0, 12)) {
    if (l.length <= 90 && TITLE_HINTS.test(l)) { title = l; break; }
  }
  if (!title && lines[0] && lines[0].length <= 90) title = lines[0];

  // Company: "at X", "@ X", or "Company: X"
  const atMatch = text.match(/\bat\s+([A-Z][\w&.\- ]{1,60})/);
  const companyLabel = text.match(/Company\s*[:\-]\s*([^\n]+)/i);
  company = (companyLabel?.[1] || atMatch?.[1] || "").trim();

  // Location
  const locLabel = text.match(/Location\s*[:\-]\s*([^\n]+)/i);
  const remote = /\b(remote|hybrid|on[- ]?site)\b/i.exec(text);
  const cityState = text.match(/\b([A-Z][a-zA-Z]+(?:[\s-][A-Z][a-zA-Z]+)*),\s*([A-Z]{2}|[A-Z][a-z]+)\b/);
  location = (locLabel?.[1] || cityState?.[0] || remote?.[0] || "").trim();

  // Salary
  const sal = text.match(/(?:\$|€|£)\s?\d{2,3}[,. ]?\d{3}(?:\s*(?:[-–to]+)\s*(?:\$|€|£)?\s?\d{2,3}[,. ]?\d{3})?(?:\s*(?:\/yr|\/year|per year|annually|k))?/i);
  const salK = text.match(/\b\d{2,3}\s?[kK]\b(?:\s*(?:[-–to]+)\s*\d{2,3}\s?[kK])?/);
  salary = (sal?.[0] || salK?.[0] || "").trim();

  return {
    title,
    company,
    location,
    salary,
    description: text.trim(),
    keywords: extractKeywords(text),
  };
}

const STOP = new Set(
  "a an and or to of in on for with the is are be been by at as it its our we you your they their this that these those will would should can could may might who whom what where when how than then so if not no but also from into out about over under above below not".split(/\s+/),
);

// Domain dictionary — biases the extractor toward useful skills/tools
const TECH = [
  "javascript","typescript","react","next.js","node","python","java","go","rust","sql","postgres","mysql","mongodb","graphql","rest","aws","gcp","azure","docker","kubernetes","terraform","ci/cd","redux","tailwind","figma","scrum","agile","jira","linux","git","kafka","spark","airflow","snowflake","dbt","tableau","power bi","excel","salesforce","hubspot","jira","ml","llm","openai","pytorch","tensorflow","langchain","rag","seo","sem","ga4","copywriting","crm","b2b","saas","fintech","healthtech","p&l","stakeholder","roadmap","okrs","kpis","a/b","analytics","etl","oop","microservices","ci","cd","s3","lambda","cloudfront","redis","webpack","vite","jest","cypress","playwright","react native","ios","android","swift","kotlin","figma","sketch","prototyping","ux","ui","accessibility","wcag",
];

export function extractKeywords(text: string): string[] {
  const found = new Set<string>();
  const lower = " " + text.toLowerCase() + " ";
  for (const t of TECH) {
    const needle = ` ${t.toLowerCase()} `;
    if (lower.includes(needle) || lower.includes(`(${t.toLowerCase()})`)) found.add(t);
  }
  // Add Capitalized multi-word phrases (e.g. "Product Strategy")
  const phraseRe = /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2})\b/g;
  const freq = new Map<string, number>();
  let m: RegExpExecArray | null;
  while ((m = phraseRe.exec(text))) {
    const p = m[1];
    if (p.length < 4 || p.length > 40) continue;
    const low = p.toLowerCase();
    if (STOP.has(low)) continue;
    freq.set(p, (freq.get(p) ?? 0) + 1);
  }
  [...freq.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .forEach(([p]) => found.add(p));
  return [...found];
}
