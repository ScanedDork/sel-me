// Minimal CSV parser (handles quoted fields and escaped quotes).
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let i = 0, field = "", row: string[] = [], inQuote = false;
  const t = text.replace(/\r\n?/g, "\n");
  while (i < t.length) {
    const c = t[i];
    if (inQuote) {
      if (c === '"') {
        if (t[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuote = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuote = true; i++; continue; }
    if (c === ",") { row.push(field); field = ""; i++; continue; }
    if (c === "\n") { row.push(field); rows.push(row); field = ""; row = []; i++; continue; }
    field += c; i++;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).filter((r) => r.some((x) => x.trim())).map((r) => {
    const o: Record<string, string> = {};
    header.forEach((h, idx) => { o[h] = (r[idx] ?? "").trim(); });
    return o;
  });
}

export function mapCsvRowToJob(row: Record<string, string>) {
  const pick = (...keys: string[]) => {
    for (const k of keys) if (row[k]) return row[k];
    return "";
  };
  return {
    title: pick("title", "job title", "role"),
    company: pick("company", "company name", "employer"),
    location: pick("location", "city"),
    url: pick("url", "link", "job url"),
    source: pick("source", "site"),
    salary: pick("salary", "compensation", "pay"),
    description: pick("description", "job description", "details"),
    appliedDate: pick("applied", "applied date", "date applied"),
    notes: pick("notes", "note"),
  };
}
