import JSZip from "jszip";
import FileSaver from "file-saver";
const { saveAs } = FileSaver;
import type { ResumeData } from "./types";

// Collect all text strings from a base resume that the user may edit.
function collectEditableStrings(base: ResumeData): string[] {
  const out: string[] = [];
  const push = (s: string) => {
    const t = (s ?? "").trim();
    if (t) out.push(t);
  };
  push(base.name);
  push(base.title);
  push(base.contact);
  push(base.summary);
  push(base.skills);
  for (const e of base.experience) {
    push(e.company);
    push(e.role);
    push(e.location);
    push(e.dates);
    e.bullets.forEach(push);
  }
  for (const e of base.education) {
    push(e.institution);
    push(e.degree);
    push(e.location);
    push(e.dates);
    e.bullets.forEach(push);
  }
  for (const c of base.certifications) {
    push(c.year);
    push(c.provider);
    push(c.title);
    push(c.details);
  }
  for (const l of base.leadership) {
    push(l.org);
    push(l.role);
    push(l.dates);
    push(l.details);
  }
  for (const v of base.volunteer) {
    push(v.year);
    push(v.title);
    push(v.details);
  }
  push(base.personal);
  // Longest first for replace-once safety
  return Array.from(new Set(out)).sort((a, b) => b.length - a.length);
}

function collectEditedStrings(edited: ResumeData): string[] {
  return collectEditableStrings(edited);
}

// Pair edits: same key path → original/edited mapping
function buildReplacementMap(
  base: ResumeData,
  edited: ResumeData
): Array<{ from: string; to: string }> {
  const pairs: Array<{ from: string; to: string }> = [];
  const add = (from: string, to: string) => {
    const f = (from ?? "").trim();
    const t = (to ?? "").trim();
    if (f && t && f !== t) pairs.push({ from: f, to: t });
  };
  add(base.name, edited.name);
  add(base.title, edited.title);
  add(base.contact, edited.contact);
  add(base.summary, edited.summary);
  add(base.skills, edited.skills);
  const minLen = Math.min;
  for (let i = 0; i < minLen(base.experience.length, edited.experience.length); i++) {
    const a = base.experience[i];
    const b = edited.experience[i];
    add(a.company, b.company);
    add(a.role, b.role);
    add(a.location, b.location);
    add(a.dates, b.dates);
    for (let k = 0; k < minLen(a.bullets.length, b.bullets.length); k++) {
      add(a.bullets[k], b.bullets[k]);
    }
  }
  for (let i = 0; i < minLen(base.education.length, edited.education.length); i++) {
    const a = base.education[i];
    const b = edited.education[i];
    add(a.institution, b.institution);
    add(a.degree, b.degree);
    add(a.location, b.location);
    add(a.dates, b.dates);
    for (let k = 0; k < minLen(a.bullets.length, b.bullets.length); k++) {
      add(a.bullets[k], b.bullets[k]);
    }
  }
  for (let i = 0; i < minLen(base.certifications.length, edited.certifications.length); i++) {
    const a = base.certifications[i];
    const b = edited.certifications[i];
    add(a.year, b.year);
    add(a.provider, b.provider);
    add(a.title, b.title);
    add(a.details, b.details);
  }
  for (let i = 0; i < minLen(base.leadership.length, edited.leadership.length); i++) {
    const a = base.leadership[i];
    const b = edited.leadership[i];
    add(a.org, b.org);
    add(a.role, b.role);
    add(a.dates, b.dates);
    add(a.details, b.details);
  }
  for (let i = 0; i < minLen(base.volunteer.length, edited.volunteer.length); i++) {
    const a = base.volunteer[i];
    const b = edited.volunteer[i];
    add(a.year, b.year);
    add(a.title, b.title);
    add(a.details, b.details);
  }
  add(base.personal, edited.personal);
  // Longest-first to avoid sub-string collisions
  return pairs.sort((x, y) => y.from.length - x.from.length);
}

const XML_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

/**
 * Edit the document.xml of a .docx in place, replacing matched original text
 * (per paragraph or per run) with edited text. Layout is preserved because we
 * only change `<w:t>` text content.
 */
export async function exportEditedDocx(
  originalBytes: ArrayBuffer,
  base: ResumeData,
  edited: ResumeData,
  filename: string
): Promise<void> {
  const zip = await JSZip.loadAsync(originalBytes);
  const docXmlFile = zip.file("word/document.xml");
  if (!docXmlFile) throw new Error("Invalid docx: missing document.xml");
  const xmlStr = await docXmlFile.async("string");

  const replacements = buildReplacementMap(base, edited);

  const parser = new DOMParser();
  const serializer = new XMLSerializer();
  const doc = parser.parseFromString(xmlStr, "application/xml");

  const paragraphs = Array.from(doc.getElementsByTagNameNS(XML_NS, "p"));
  for (const p of paragraphs) {
    const ts = Array.from(p.getElementsByTagNameNS(XML_NS, "t"));
    if (ts.length === 0) continue;
    const combined = ts.map((t) => t.textContent ?? "").join("");
    let replaced: string | null = null;
    for (const { from, to } of replacements) {
      if (combined.includes(from)) {
        replaced = combined.split(from).join(to);
        break;
      }
    }
    if (replaced !== null) {
      // Put all new text into first <w:t>, clear the rest
      ts[0].textContent = replaced;
      ts[0].setAttribute("xml:space", "preserve");
      for (let k = 1; k < ts.length; k++) ts[k].textContent = "";
    } else {
      // Fall back to per-run replacements
      for (const t of ts) {
        let txt = t.textContent ?? "";
        let changed = false;
        for (const { from, to } of replacements) {
          if (txt.includes(from)) {
            txt = txt.split(from).join(to);
            changed = true;
          }
        }
        if (changed) {
          t.textContent = txt;
          t.setAttribute("xml:space", "preserve");
        }
      }
    }
  }

  const newXml = serializer.serializeToString(doc);
  zip.file("word/document.xml", newXml);
  const blob = await zip.generateAsync({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  saveAs(blob, filename.endsWith(".docx") ? filename : `${filename}.docx`);
}

/**
 * Render the resume as HTML using the original docx (via mammoth) then run
 * paragraph text replacement on the HTML, and convert to PDF via html2pdf.
 */
export async function exportEditedPdf(
  originalBytes: ArrayBuffer,
  base: ResumeData,
  edited: ResumeData,
  filename: string
): Promise<void> {
  const mammoth = (await import("mammoth/mammoth.browser")).default;
  const result = await mammoth.convertToHtml({ arrayBuffer: originalBytes });
  let html = result.value;

  const replacements = buildReplacementMap(base, edited);
  for (const { from, to } of replacements) {
    html = html.split(escapeHtml(from)).join(escapeHtml(to));
    html = html.split(from).join(to);
  }

  const wrapper = document.createElement("div");
  wrapper.style.padding = "24px";
  wrapper.style.fontFamily = "Calibri, Helvetica, Arial, sans-serif";
  wrapper.style.color = "#111";
  wrapper.style.background = "#fff";
  wrapper.style.maxWidth = "780px";
  wrapper.innerHTML = `<style>
    h1{font-size:22px;margin:0 0 4px;}
    h2{font-size:14px;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #999;margin:14px 0 6px;}
    h3{font-size:12px;margin:8px 0 2px;}
    p{font-size:11px;line-height:1.4;margin:2px 0;}
    ul{margin:4px 0 4px 18px;padding:0;}
    li{font-size:11px;line-height:1.4;}
    a{color:#1f3a8a;}
  </style>${html}`;
  document.body.appendChild(wrapper);
  try {
    const html2pdf = (await import("html2pdf.js")).default as any;
    await html2pdf()
      .from(wrapper)
      .set({
        margin: [10, 12, 10, 12],
        filename: filename.endsWith(".pdf") ? filename : `${filename}.pdf`,
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] },
      })
      .save();
  } finally {
    wrapper.remove();
  }
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/**
 * Export arbitrary plain text (e.g. a rendered cover letter) as a clean DOCX.
 */
export async function exportTextDocx(text: string, filename: string): Promise<void> {
  const { Document, Packer, Paragraph, TextRun } = await import("docx");
  const blocks = text.replace(/\r\n/g, "\n").split(/\n/);
  const paragraphs = blocks.map(
    (line) =>
      new Paragraph({
        spacing: { after: 160 },
        children: [new TextRun({ text: line, font: "Calibri", size: 22 })],
      }),
  );
  const doc = new Document({
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children: paragraphs,
      },
    ],
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename.endsWith(".docx") ? filename : `${filename}.docx`);
}

/**
 * Export arbitrary plain text as a PDF using html2pdf.
 */
export async function exportTextPdf(text: string, filename: string): Promise<void> {
  const html = text
    .replace(/\r\n/g, "\n")
    .split(/\n/)
    .map((l) => `<p>${escapeHtml(l) || "&nbsp;"}</p>`)
    .join("");
  const wrapper = document.createElement("div");
  wrapper.style.padding = "24px";
  wrapper.style.maxWidth = "780px";
  wrapper.style.background = "#fff";
  wrapper.style.color = "#111";
  wrapper.innerHTML = `<style>
    p{font-family:Calibri,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;margin:0 0 6px;}
  </style>${html}`;
  document.body.appendChild(wrapper);
  try {
    const html2pdf = (await import("html2pdf.js")).default as any;
    await html2pdf()
      .from(wrapper)
      .set({
        margin: [12, 14, 12, 14],
        filename: filename.endsWith(".pdf") ? filename : `${filename}.pdf`,
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] },
      })
      .save();
  } finally {
    wrapper.remove();
  }
}
