// Client-side branded document generation (DOCX + PDF). Export is only
// reachable once the compliance outcome is PASS (gating enforced in the UI
// and re-checked by callers).

import type { DraftAnswer, Persona, Rfp } from "./types";
import { TIER_CHIP } from "./types";
import { formatDate } from "./util";

interface ExportInput {
  rfp: Rfp;
  answers: Record<string, DraftAnswer>;
  adviser: Persona | null;
  standardDisclosure: string;
}

const BRAND = {
  firm: "J.P. Morgan Asset Management",
  ink: "16130F",
  accent: "7A5C3E",
  faint: "8A8177",
};

function docTitle(rfp: Rfp) {
  return `Response to Request for Proposal — ${rfp.issuer}`;
}

function answeredQuestions(input: ExportInput) {
  return input.rfp.sections.map((section) => ({
    section,
    items: section.questions
      .map((q) => ({ q, a: input.answers[q.id] }))
      .filter((x) => x.a && x.a.tier !== 4 && x.a.text.trim()),
  }));
}

/**
 * Client-format export: writes the drafted answers back into the questionnaire
 * exactly as received — original numbering, headings, and layout — rather than
 * generating a branded response document. Standard disclosures are appended.
 * Production: template into the parsed source docx; the prototype rebuilds the
 * received layout from the parse structure.
 */
export async function exportClientDocx(input: ExportInput): Promise<void> {
  const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } = await import("docx");
  const { saveAs } = await import("file-saver");
  const { rfp } = input;

  const children: InstanceType<typeof Paragraph>[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: rfp.kind === "DDQ" ? "DUE DILIGENCE QUESTIONNAIRE" : "REQUEST FOR PROPOSAL",
          font: "Helvetica",
          size: 18,
          color: BRAND.faint,
          allCaps: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ text: rfp.issuer, font: "Georgia", size: 36, color: BRAND.ink })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: `${rfp.mandate} — Due ${formatDate(rfp.deadline)}`,
          font: "Georgia",
          size: 22,
          italics: true,
          color: BRAND.ink,
        }),
      ],
    }),
  ];

  for (const section of rfp.sections) {
    children.push(
      new Paragraph({
        spacing: { before: 360, after: 200 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: BRAND.ink } },
        children: [new TextRun({ text: section.title, font: "Georgia", size: 26, bold: true, color: BRAND.ink })],
      })
    );
    for (const q of section.questions) {
      const answer = input.answers[q.id];
      children.push(
        new Paragraph({
          spacing: { before: 240, after: 100 },
          children: [new TextRun({ text: `${q.number}  ${q.text}`, font: "Georgia", size: 22, bold: true, color: BRAND.ink })],
        }),
        new Paragraph({
          spacing: { after: 160 },
          children: [
            new TextRun({ text: answer?.text.trim() ? answer.text : " ", font: "Georgia", size: 21, color: BRAND.ink }),
          ],
        })
      );
    }
  }

  children.push(
    new Paragraph({
      spacing: { before: 480, after: 120 },
      children: [new TextRun({ text: "Important Information", font: "Georgia", size: 24, bold: true, color: BRAND.ink })],
    }),
    new Paragraph({
      children: [new TextRun({ text: input.standardDisclosure, font: "Georgia", size: 17, italics: true, color: BRAND.faint })],
    })
  );

  const doc = new Document({
    creator: BRAND.firm,
    title: `${rfp.issuer} — ${rfp.mandate}`,
    sections: [{ children }],
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${rfp.shortName}-Questionnaire-Response.docx`);
}

export async function exportDocx(input: ExportInput): Promise<void> {
  const { Document, HeadingLevel, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } = await import("docx");
  const { saveAs } = await import("file-saver");
  const { rfp } = input;

  const children: InstanceType<typeof Paragraph>[] = [
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 60 },
      children: [
        new TextRun({ text: BRAND.firm, font: "Georgia", size: 40, color: BRAND.ink }),
      ],
    }),
    new Paragraph({
      spacing: { after: 400 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: BRAND.accent } },
      children: [
        new TextRun({ text: "INSTITUTIONAL RESPONSE", font: "Helvetica", size: 16, color: BRAND.faint, allCaps: true }),
      ],
    }),
    new Paragraph({
      spacing: { after: 120 },
      children: [new TextRun({ text: docTitle(rfp), font: "Georgia", size: 32, color: BRAND.ink })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({ text: `${rfp.mandate} · ${rfp.mandateSize} · ${rfp.vehicle}`, font: "Helvetica", size: 20, color: BRAND.ink }),
      ],
    }),
    new Paragraph({
      spacing: { after: 500 },
      children: [
        new TextRun({
          text: `Submitted ${formatDate(new Date().toISOString().slice(0, 10))}${rfp.consultant ? ` · via ${rfp.consultant}` : ""}${input.adviser ? ` · Client Adviser: ${input.adviser.name}` : ""}`,
          font: "Helvetica",
          size: 18,
          color: BRAND.faint,
        }),
      ],
    }),
  ];

  for (const { section, items } of answeredQuestions(input)) {
    if (items.length === 0) continue;
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 360, after: 160 },
        children: [new TextRun({ text: section.title, font: "Georgia", size: 26, color: BRAND.accent })],
      })
    );
    for (const { q, a } of items) {
      children.push(
        new Paragraph({
          spacing: { before: 200, after: 80 },
          children: [new TextRun({ text: `${q.number}  ${q.text}`, font: "Helvetica", size: 21, bold: true, color: BRAND.ink })],
        }),
        new Paragraph({
          spacing: { after: 160 },
          children: [new TextRun({ text: a!.text, font: "Helvetica", size: 20, color: BRAND.ink })],
        })
      );
    }
  }

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 480, after: 120 },
      children: [new TextRun({ text: "Important Information", font: "Georgia", size: 24, color: BRAND.accent })],
    }),
    new Paragraph({
      children: [new TextRun({ text: input.standardDisclosure, font: "Helvetica", size: 17, italics: true, color: BRAND.faint })],
    })
  );

  const doc = new Document({
    creator: BRAND.firm,
    title: docTitle(rfp),
    sections: [{ children }],
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${rfp.shortName}-RFP-Response.docx`);
}

export async function exportPdf(input: ExportInput): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const { rfp } = input;
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 64;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const width = pageWidth - margin * 2;
  let y = margin;

  const ensureRoom = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const text = (
    str: string,
    opts: { font?: "times" | "helvetica"; style?: "normal" | "bold" | "italic"; size: number; color: [number, number, number]; gapAfter?: number; lineGap?: number }
  ) => {
    doc.setFont(opts.font ?? "helvetica", opts.style ?? "normal");
    doc.setFontSize(opts.size);
    doc.setTextColor(...opts.color);
    const lines: string[] = doc.splitTextToSize(str, width);
    const lineHeight = opts.size * 1.35 + (opts.lineGap ?? 0);
    for (const line of lines) {
      ensureRoom(lineHeight);
      doc.text(line, margin, y);
      y += lineHeight;
    }
    y += opts.gapAfter ?? 0;
  };

  const inkRgb: [number, number, number] = [22, 19, 15];
  const accentRgb: [number, number, number] = [122, 92, 62];
  const faintRgb: [number, number, number] = [138, 129, 119];

  text(BRAND.firm, { font: "times", size: 24, color: inkRgb, gapAfter: 2 });
  text("INSTITUTIONAL RESPONSE", { size: 8, color: faintRgb, gapAfter: 6 });
  doc.setDrawColor(...accentRgb);
  doc.setLineWidth(1.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 24;
  text(docTitle(rfp), { font: "times", size: 17, color: inkRgb, gapAfter: 4 });
  text(`${rfp.mandate} · ${rfp.mandateSize} · ${rfp.vehicle}`, { size: 10.5, color: inkRgb, gapAfter: 2 });
  text(
    `Submitted ${formatDate(new Date().toISOString().slice(0, 10))}${rfp.consultant ? ` · via ${rfp.consultant}` : ""}${input.adviser ? ` · Client Adviser: ${input.adviser.name}` : ""}`,
    { size: 9, color: faintRgb, gapAfter: 20 }
  );

  for (const { section, items } of answeredQuestions(input)) {
    if (items.length === 0) continue;
    ensureRoom(40);
    y += 10;
    text(section.title, { font: "times", size: 13.5, color: accentRgb, gapAfter: 6 });
    for (const { q, a } of items) {
      ensureRoom(36);
      text(`${q.number}  ${q.text}`, { style: "bold", size: 10.5, color: inkRgb, gapAfter: 2 });
      text(a!.text, { size: 10, color: inkRgb, gapAfter: 12 });
    }
  }

  y += 14;
  text("Important Information", { font: "times", size: 12.5, color: accentRgb, gapAfter: 4 });
  text(input.standardDisclosure, { style: "italic", size: 8.5, color: faintRgb });

  doc.save(`${rfp.shortName}-RFP-Response.pdf`);
}

/** Provenance summary appended nowhere in the client doc — used for the audit side-sheet. */
export function provenanceSummary(answers: Record<string, DraftAnswer>): string {
  const counts = new Map<string, number>();
  for (const a of Object.values(answers)) {
    counts.set(TIER_CHIP[a.tier], (counts.get(TIER_CHIP[a.tier]) ?? 0) + 1);
  }
  return [...counts.entries()].map(([k, v]) => `${k}: ${v}`).join(" · ");
}
