"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ArrowLeft, FileDown, FileUp, Play } from "lucide-react";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { PageHeader } from "@/components/admin/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { Subject } from "@/types/api";

/**
 * Bulk-upload Level Test questions from a CSV or JSONL file.
 *
 * Flow:
 *   1. Admin drops a file (or pastes text).
 *   2. Client parses + validates row-by-row locally so obvious
 *      shape errors surface before we hit the wire.
 *   3. Preview shows valid rows with a green tick, invalid rows
 *      with a per-row reason.
 *   4. Import button ships the valid rows to
 *      POST /admin/pm-test/bulk. Default lands as pending_review;
 *      a "Publish immediately" checkbox opts into ACTIVE.
 *
 * CSV columns (order-independent; header row required):
 *   subject_code, form_level, exam_type, difficulty, body,
 *   option_a, option_b, option_c, option_d, correct_letter,
 *   explanation (optional), syllabus_topic_id (optional)
 *
 * JSONL: one JSON object per line matching the AI-generator shape
 * ({ subjectId | subject_code, formLevel, examType, difficulty, body,
 * options[], explanation?, syllabusTopicId? }).
 */
type ParsedRow = {
  ok: true;
  index: number;
  raw: unknown;
  payload: ImportPayload;
} | {
  ok: false;
  index: number;
  raw: unknown;
  reason: string;
};

interface ImportPayload {
  subjectId: string;
  formLevel: number;
  examType: string;
  difficulty: "easy" | "medium" | "hard";
  body: string;
  explanation?: string;
  syllabusTopicId?: string;
  options: Array<{ label: string; body: string; isCorrect: boolean }>;
}

export default function LevelTestImportPage() {
  const [text, setText] = useState("");
  const [format, setFormat] = useState<"csv" | "jsonl">("csv");
  const [publishImmediately, setPublishImmediately] = useState(false);

  const subjectsQ = useQuery({
    queryKey: QK.SUBJECTS_LIST({}),
    queryFn: () => unwrap<Subject[]>(api.get("/subjects")),
  });
  const subjectsByCode = new Map(
    (subjectsQ.data ?? []).map((s) => [s.code.toLowerCase(), s]),
  );
  const subjectsById = new Map((subjectsQ.data ?? []).map((s) => [s.id, s]));

  const parsed = parseInput(text, format, subjectsByCode, subjectsById);
  const validCount = parsed.filter((r) => r.ok).length;
  const rejectedCount = parsed.length - validCount;

  const importMut = useMutation({
    mutationFn: async () => {
      const items = parsed
        .filter((r): r is Extract<ParsedRow, { ok: true }> => r.ok)
        .map((r) => r.payload);
      if (items.length === 0) throw new Error("No valid rows to import.");
      return unwrap<{
        inserted: number;
        rejected: Array<{ index: number; reason: string; detail: string }>;
        ids: string[];
      }>(
        api.post("/admin/pm-test/bulk", {
          items,
          publishImmediately,
        }),
      );
    },
    onSuccess: (res) => {
      toast.success(
        `Imported ${res.inserted} question${res.inserted === 1 ? "" : "s"}${
          res.rejected.length ? ` — ${res.rejected.length} rejected on server` : ""
        }`,
        { duration: 6000 },
      );
      if (res.rejected.length === 0) {
        setText("");
      }
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Import failed"),
  });

  const onFile = async (f: File) => {
    const raw = await f.text();
    setText(raw);
    setFormat(f.name.toLowerCase().endsWith(".jsonl") ? "jsonl" : "csv");
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Bulk upload Level Test questions"
        description="Import CSV or JSONL. Rows default to pending_review — flip the switch below to publish immediately."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/admin/level-tests">
                <ArrowLeft className="h-4 w-4" /> Back to list
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <a href="/level-tests-template.csv" download>
                <FileDown className="h-4 w-4" /> Template CSV
              </a>
            </Button>
          </>
        }
      />

      <Card className="p-4 space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Source
        </div>
        <div className="flex items-center gap-3">
          <label className="flex-1 cursor-pointer rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600 hover:bg-slate-100">
            <input
              type="file"
              accept=".csv,.jsonl,.txt"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
              }}
            />
            <FileUp className="mx-auto mb-2 h-6 w-6 text-slate-500" />
            Drop a CSV or JSONL file, or click to pick one.
          </label>
          <div className="flex flex-col gap-2 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                checked={format === "csv"}
                onChange={() => setFormat("csv")}
              />
              CSV
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                checked={format === "jsonl"}
                onChange={() => setFormat("jsonl")}
              />
              JSONL
            </label>
          </div>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          placeholder={
            format === "csv"
              ? "subject_code,form_level,exam_type,difficulty,body,option_a,option_b,option_c,option_d,correct_letter,explanation\nCHEM,2,wassce,medium,What is …,option A text,option B text,option C text,option D text,B,short rationale"
              : `{"subject_code":"CHEM","formLevel":2,"examType":"wassce","difficulty":"medium","body":"…","options":[{"label":"A","body":"…","isCorrect":false},…],"explanation":"…"}`
          }
          className="w-full rounded-md border border-slate-200 bg-white p-3 font-mono text-xs"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            {parsed.length > 0 && (
              <>
                <Badge variant="success">{validCount} valid</Badge>
                {rejectedCount > 0 && (
                  <Badge variant="destructive">{rejectedCount} rejected</Badge>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <Checkbox
                checked={publishImmediately}
                onCheckedChange={(v) => setPublishImmediately(Boolean(v))}
              />
              Publish immediately (skip review queue)
            </label>
            <Button
              onClick={() => importMut.mutate()}
              disabled={validCount === 0}
              loading={importMut.isPending}
            >
              <Play className="h-4 w-4" /> Import {validCount} row
              {validCount === 1 ? "" : "s"}
            </Button>
          </div>
        </div>
      </Card>

      {parsed.length > 0 && (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-left">
              <tr>
                <th className="w-8 px-3 py-2" />
                <th className="w-12 px-2 py-2 text-xs uppercase text-slate-500">
                  #
                </th>
                <th className="px-2 py-2 text-xs uppercase text-slate-500">
                  Body / reason
                </th>
                <th className="px-2 py-2 text-xs uppercase text-slate-500">
                  Subject
                </th>
                <th className="px-2 py-2 text-xs uppercase text-slate-500">
                  Form
                </th>
                <th className="px-2 py-2 text-xs uppercase text-slate-500">
                  Diff.
                </th>
              </tr>
            </thead>
            <tbody>
              {parsed.slice(0, 50).map((r) => (
                <tr
                  key={r.index}
                  className={
                    r.ok
                      ? "border-b border-slate-50 hover:bg-slate-50"
                      : "border-b border-rose-50 bg-rose-50/40"
                  }
                >
                  <td className="px-3 py-2">
                    {r.ok ? (
                      <Badge variant="success" className="text-[10px]">
                        OK
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px]">
                        NO
                      </Badge>
                    )}
                  </td>
                  <td className="px-2 py-2 text-xs text-slate-500">
                    {r.index + 1}
                  </td>
                  <td className="px-2 py-2 text-slate-700">
                    {r.ok ? (
                      <span className="line-clamp-2 max-w-md">
                        {r.payload.body}
                      </span>
                    ) : (
                      <span className="text-rose-700">{r.reason}</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-xs text-slate-500">
                    {r.ok
                      ? (subjectsById.get(r.payload.subjectId)?.name ?? "—")
                      : ""}
                  </td>
                  <td className="px-2 py-2 text-xs">
                    {r.ok ? `F${r.payload.formLevel}` : ""}
                  </td>
                  <td className="px-2 py-2 text-xs capitalize">
                    {r.ok ? r.payload.difficulty : ""}
                  </td>
                </tr>
              ))}
              {parsed.length > 50 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-2 text-center text-xs text-slate-500"
                  >
                    Showing the first 50 rows of {parsed.length}. Server
                    will process every row.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------

function parseInput(
  text: string,
  format: "csv" | "jsonl",
  subjectsByCode: Map<string, Subject>,
  subjectsById: Map<string, Subject>,
): ParsedRow[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (format === "jsonl") return parseJsonl(trimmed, subjectsByCode, subjectsById);
  return parseCsv(trimmed, subjectsByCode);
}

function parseJsonl(
  text: string,
  subjectsByCode: Map<string, Subject>,
  subjectsById: Map<string, Subject>,
): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  return lines.map((line, i) => {
    try {
      const obj = JSON.parse(line) as Record<string, unknown>;
      const payload = normalize(obj, subjectsByCode, subjectsById);
      return { ok: true, index: i, raw: obj, payload };
    } catch (err) {
      return {
        ok: false,
        index: i,
        raw: line,
        reason: (err as Error).message,
      };
    }
  });
}

function parseCsv(
  text: string,
  subjectsByCode: Map<string, Subject>,
): ParsedRow[] {
  const rows = parseCsvRows(text);
  if (rows.length === 0) return [];
  const [header, ...body] = rows;
  const idx = (name: string) =>
    header.findIndex((h) => h.trim().toLowerCase() === name);
  const cSubject = idx("subject_code");
  const cForm = idx("form_level");
  const cExam = idx("exam_type");
  const cDiff = idx("difficulty");
  const cBody = idx("body");
  const cA = idx("option_a");
  const cB = idx("option_b");
  const cC = idx("option_c");
  const cD = idx("option_d");
  const cCorrect = idx("correct_letter");
  const cExplanation = idx("explanation");
  const cTopic = idx("syllabus_topic_id");

  const required = { cSubject, cForm, cExam, cDiff, cBody, cA, cB, cC, cD, cCorrect };
  const missing = Object.entries(required)
    .filter(([, v]) => v === -1)
    .map(([k]) => k.slice(1).toLowerCase());
  if (missing.length > 0) {
    return [
      {
        ok: false,
        index: 0,
        raw: header,
        reason: `Missing required columns: ${missing.join(", ")}`,
      },
    ];
  }

  return body.map((row, i) => {
    try {
      const raw: Record<string, string> = {
        subject_code: row[cSubject],
        form_level: row[cForm],
        exam_type: row[cExam],
        difficulty: row[cDiff],
        body: row[cBody],
        option_a: row[cA],
        option_b: row[cB],
        option_c: row[cC],
        option_d: row[cD],
        correct_letter: row[cCorrect],
        explanation: cExplanation !== -1 ? row[cExplanation] : "",
        syllabus_topic_id: cTopic !== -1 ? row[cTopic] : "",
      };
      const payload = normalizeCsv(raw, subjectsByCode);
      return { ok: true, index: i, raw, payload };
    } catch (err) {
      return {
        ok: false,
        index: i,
        raw: row,
        reason: (err as Error).message,
      };
    }
  });
}

function parseCsvRows(text: string): string[][] {
  // Minimal CSV parser — handles quoted cells with embedded commas
  // and doubled quotes. No escape sequences beyond RFC 4180.
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let i = 0;
  let inQuotes = false;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 2;
        continue;
      }
      if (ch === '"') {
        inQuotes = false;
        i++;
        continue;
      }
      cell += ch;
      i++;
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ",") {
        row.push(cell);
        cell = "";
        i++;
      } else if (ch === "\r") {
        i++;
      } else if (ch === "\n") {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
        i++;
      } else {
        cell += ch;
        i++;
      }
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function normalizeCsv(
  raw: Record<string, string>,
  subjectsByCode: Map<string, Subject>,
): ImportPayload {
  const subjectCode = (raw.subject_code ?? "").trim().toLowerCase();
  const subject = subjectsByCode.get(subjectCode);
  if (!subject) throw new Error(`Unknown subject code "${raw.subject_code}"`);
  const formLevel = parseInt((raw.form_level ?? "").trim(), 10);
  if (![1, 2, 3].includes(formLevel))
    throw new Error(`form_level must be 1, 2, or 3 (got "${raw.form_level}")`);
  const examType = (raw.exam_type ?? "").trim().toLowerCase();
  if (!["wassce", "bece", "novdec"].includes(examType))
    throw new Error(`exam_type must be wassce, bece, or novdec`);
  const difficulty = (raw.difficulty ?? "").trim().toLowerCase();
  if (!["easy", "medium", "hard"].includes(difficulty))
    throw new Error(`difficulty must be easy, medium, or hard`);
  const body = (raw.body ?? "").trim();
  if (body.length === 0) throw new Error("body is empty");
  const correct = (raw.correct_letter ?? "").trim().toUpperCase();
  if (!["A", "B", "C", "D"].includes(correct))
    throw new Error(`correct_letter must be one of A, B, C, D`);
  const options = (["A", "B", "C", "D"] as const).map((label) => {
    const key = `option_${label.toLowerCase()}` as keyof typeof raw;
    const text = (raw[key] ?? "").trim();
    if (text.length === 0)
      throw new Error(`option ${label} is empty`);
    return { label, body: text, isCorrect: label === correct };
  });
  return {
    subjectId: subject.id,
    formLevel,
    examType,
    difficulty: difficulty as ImportPayload["difficulty"],
    body,
    explanation: (raw.explanation ?? "").trim() || undefined,
    syllabusTopicId: (raw.syllabus_topic_id ?? "").trim() || undefined,
    options,
  };
}

function normalize(
  obj: Record<string, unknown>,
  subjectsByCode: Map<string, Subject>,
  subjectsById: Map<string, Subject>,
): ImportPayload {
  const subjectId =
    (typeof obj.subjectId === "string" && obj.subjectId) ||
    (typeof obj.subject_id === "string" && obj.subject_id) ||
    (typeof obj.subject_code === "string" &&
      subjectsByCode.get(obj.subject_code.toLowerCase())?.id) ||
    "";
  if (!subjectId || !subjectsById.has(subjectId))
    throw new Error("Missing or unknown subject");
  const formLevel = Number(obj.formLevel ?? obj.form_level);
  if (![1, 2, 3].includes(formLevel))
    throw new Error("formLevel must be 1, 2, or 3");
  const examType = String(obj.examType ?? obj.exam_type ?? "").toLowerCase();
  if (!["wassce", "bece", "novdec"].includes(examType))
    throw new Error("examType must be wassce, bece, or novdec");
  const difficulty = String(obj.difficulty ?? "").toLowerCase();
  if (!["easy", "medium", "hard"].includes(difficulty))
    throw new Error("difficulty must be easy, medium, or hard");
  const body = String(obj.body ?? "").trim();
  if (!body) throw new Error("body is empty");
  const rawOptions = Array.isArray(obj.options) ? obj.options : [];
  if (rawOptions.length !== 4)
    throw new Error("options must have exactly 4 entries");
  const options = rawOptions.map((o, i) => {
    const opt = o as Record<string, unknown>;
    const label =
      typeof opt.label === "string" ? opt.label : ["A", "B", "C", "D"][i];
    const b = String(opt.body ?? "").trim();
    if (!b) throw new Error(`option ${label} is empty`);
    return { label, body: b, isCorrect: opt.isCorrect === true };
  });
  const correctCount = options.filter((o) => o.isCorrect).length;
  if (correctCount !== 1)
    throw new Error(`options must have exactly one isCorrect=true (got ${correctCount})`);
  return {
    subjectId,
    formLevel,
    examType,
    difficulty: difficulty as ImportPayload["difficulty"],
    body,
    explanation:
      typeof obj.explanation === "string"
        ? obj.explanation.trim() || undefined
        : undefined,
    syllabusTopicId:
      typeof obj.syllabusTopicId === "string"
        ? obj.syllabusTopicId.trim() || undefined
        : typeof obj.syllabus_topic_id === "string"
          ? obj.syllabus_topic_id.trim() || undefined
          : undefined,
    options,
  };
}
