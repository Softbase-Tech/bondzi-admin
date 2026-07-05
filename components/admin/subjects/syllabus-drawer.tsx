"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Archive, Check, Pencil, Plus, Upload, X } from "lucide-react";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import type { Subject, SyllabusTopic } from "@/types/api";

interface Props {
  subject: Subject | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Syllabus-topics editor. Distinct from `TopicsDrawer` (which manages
 * the past-paper `topics` table). This one edits `syllabus_topics` —
 * the curriculum-aligned list per subject × exam type × form level
 * that drives PM-Test AI generation and the mobile Level-Test setup
 * screen (once Phase 1.3 lands).
 *
 * Structure:
 *   Form-level tabs (F1/F2/F3). NOVDEC subjects have no form-level
 *   syllabus at all, so the drawer refuses to open for them — the
 *   subjects page hides the button in that case.
 *
 *   Per tab:
 *     - list of topics for that form level, inline delete + edit
 *     - "Add topic" inline form
 *     - "Bulk import" textarea accepting JSON array OR CSV
 *
 * Endpoints:
 *   GET    /syllabus-topics?examType=&subjectId=&formLevel=
 *   POST   /admin/syllabus-topics                     — one
 *   PATCH  /admin/syllabus-topics/:id                 — update or reactivate
 *   DELETE /admin/syllabus-topics/:id                 — soft-delete
 *   POST   /admin/syllabus-topics/bulk                — idempotent bulk
 */
export function SyllabusDrawer({ subject, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [formLevel, setFormLevel] = useState<1 | 2 | 3>(1);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [editing, setEditing] = useState<SyllabusTopic | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [bulkText, setBulkText] = useState("");

  const filters = subject
    ? { examType: subject.examType, subjectId: subject.id, formLevel }
    : null;

  const { data: topics, isLoading } = useQuery({
    queryKey: QK.SYLLABUS_TOPICS(filters ?? {}),
    queryFn: () =>
      unwrap<SyllabusTopic[]>(
        api.get("/syllabus-topics", { params: filters ?? undefined }),
      ),
    enabled: Boolean(filters),
  });

  const invalidate = () => {
    if (subject) {
      qc.invalidateQueries({
        queryKey: QK.SYLLABUS_TOPICS({
          examType: subject.examType,
          subjectId: subject.id,
          formLevel,
        }),
      });
    }
  };

  const createMut = useMutation({
    mutationFn: () => {
      if (!subject) throw new Error("no subject");
      return unwrap<SyllabusTopic>(
        api.post("/admin/syllabus-topics", {
          subjectId: subject.id,
          examType: subject.examType,
          formLevel,
          title: newTitle.trim(),
          description: newDesc.trim() || null,
        }),
      );
    },
    onSuccess: () => {
      toast.success("Topic added");
      setNewTitle("");
      setNewDesc("");
      invalidate();
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "Add failed"),
  });

  const updateMut = useMutation({
    mutationFn: () => {
      if (!editing) throw new Error("nothing to edit");
      return unwrap<SyllabusTopic>(
        api.patch(`/admin/syllabus-topics/${editing.id}`, {
          title: editTitle.trim(),
          description: editDesc.trim() || null,
        }),
      );
    },
    onSuccess: () => {
      toast.success("Topic updated");
      setEditing(null);
      invalidate();
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "Update failed"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      unwrap(api.delete(`/admin/syllabus-topics/${id}`)),
    onSuccess: () => {
      toast.success("Topic archived");
      invalidate();
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "Delete failed"),
  });

  const bulkMut = useMutation({
    mutationFn: async () => {
      if (!subject) throw new Error("no subject");
      const rows = parseBulk(bulkText, {
        subjectId: subject.id,
        examType: subject.examType,
        formLevel,
      });
      if (rows.length === 0) {
        throw new Error(
          "No rows detected. Paste JSON array or CSV (title, description).",
        );
      }
      return unwrap<{
        submitted: number;
        inserted: number;
        updated: number;
        rejected: Array<{ index: number; reason: string }>;
      }>(api.post("/admin/syllabus-topics/bulk", { items: rows }));
    },
    onSuccess: (res) => {
      toast.success(
        `Imported: ${res.inserted} new, ${res.updated} updated${
          res.rejected.length > 0
            ? `, ${res.rejected.length} rejected — check console`
            : ""
        }`,
      );
      if (res.rejected.length > 0) {
        console.warn("[syllabus-import] rejected rows:", res.rejected);
      }
      setBulkText("");
      invalidate();
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "Import failed"),
  });

  const isNovdec = subject?.examType === "novdec";

  const availableFormLevels = useMemo<Array<1 | 2 | 3>>(
    () => (isNovdec ? [] : [1, 2, 3]),
    [isNovdec],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {subject
              ? `Syllabus — ${subject.name}`
              : "Syllabus topics"}
          </SheetTitle>
          <SheetDescription>
            Curriculum-aligned topics per form level. Drives PM-Test AI
            generation grounding and (once Phase 1.3 lands) the mobile
            Level-Test picker. Bulk-import is idempotent — re-pasting the
            same spreadsheet refreshes existing rows instead of duplicating.
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="flex flex-col gap-5">
          {isNovdec ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              NOVDEC has no form-level syllabus (no form level column). Use
              past papers only.
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                {availableFormLevels.map((n) => (
                  <Button
                    key={n}
                    size="sm"
                    variant={formLevel === n ? "default" : "outline"}
                    onClick={() => setFormLevel(n)}
                  >
                    Form {n}
                  </Button>
                ))}
              </div>

              <section className="flex flex-col gap-2">
                <h3 className="text-sm font-medium">
                  Topics for Form {formLevel}
                </h3>
                {isLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : topics && topics.length > 0 ? (
                  <ul className="flex flex-col divide-y rounded-md border">
                    {topics.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-start justify-between gap-2 p-3"
                      >
                        <div className="flex-1">
                          {editing?.id === t.id ? (
                            <div className="flex flex-col gap-1.5">
                              <Input
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                placeholder="Title"
                              />
                              <Textarea
                                rows={2}
                                value={editDesc}
                                onChange={(e) => setEditDesc(e.target.value)}
                                placeholder="Description (optional)"
                              />
                            </div>
                          ) : (
                            <>
                              <div className="text-sm font-medium">
                                {t.title}
                              </div>
                              {t.description && (
                                <div className="mt-0.5 text-xs text-slate-500">
                                  {t.description}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-1">
                          {editing?.id === t.id ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                loading={updateMut.isPending}
                                onClick={() => updateMut.mutate()}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditing(null)}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditing(t);
                                  setEditTitle(t.title);
                                  setEditDesc(t.description ?? "");
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={deleteMut.isPending}
                                onClick={() => {
                                  if (confirm(`Archive "${t.title}"?`)) {
                                    deleteMut.mutate(t.id);
                                  }
                                }}
                              >
                                <Archive className="h-3.5 w-3.5 text-rose-600" />
                              </Button>
                            </>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="rounded-md border border-dashed p-4 text-sm text-slate-500">
                    No syllabus topics for Form {formLevel} yet. Add one below
                    or bulk-import.
                  </div>
                )}
              </section>

              <section className="rounded-md border p-3">
                <h3 className="text-sm font-medium mb-2">Add topic</h3>
                <div className="flex flex-col gap-2">
                  <Input
                    placeholder="Title (e.g. Vectors and scalars)"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                  <Textarea
                    rows={2}
                    placeholder="Description (optional) — short blurb, keeps operators aligned"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                  />
                  <Button
                    size="sm"
                    className="self-start"
                    loading={createMut.isPending}
                    disabled={newTitle.trim().length === 0}
                    onClick={() => createMut.mutate()}
                  >
                    <Plus className="h-3.5 w-3.5" /> Add
                  </Button>
                </div>
              </section>

              <section className="rounded-md border p-3">
                <h3 className="mb-1 text-sm font-medium">Bulk import</h3>
                <p className="mb-2 text-xs text-slate-500">
                  Paste JSON array{" "}
                  <code className="font-mono">
                    [{'{ "title": "...", "description": "..." }'}]
                  </code>{" "}
                  OR CSV{" "}
                  <code className="font-mono">
                    title,description
                  </code>
                  . Header row optional. Idempotent — re-pasting refreshes
                  existing rows.
                </p>
                <Label htmlFor="bulk-syllabus" className="sr-only">
                  Bulk syllabus text
                </Label>
                <Textarea
                  id="bulk-syllabus"
                  rows={7}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={
                    "Vectors and scalars,Definitions + distinguishing quantities\n" +
                    "Newton's laws of motion,First / second / third — apply to real setups\n" +
                    "Momentum and impulse,Conservation in 1D + 2D"
                  }
                  className="font-mono text-xs"
                />
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    size="sm"
                    loading={bulkMut.isPending}
                    disabled={bulkText.trim().length === 0}
                    onClick={() => bulkMut.mutate()}
                  >
                    <Upload className="h-3.5 w-3.5" /> Import
                  </Button>
                  <span className="text-xs text-slate-500">
                    Cap:{" "}
                    <code className="font-mono">AI_MAX_ITEMS_PER_BATCH</code> (200 default).
                  </span>
                </div>
              </section>
            </>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Parses the bulk text as JSON first (accepting either an array of
 * items or an object with an `items` array), falling back to CSV.
 *
 * CSV rules:
 *   - split on newlines, skip blank lines
 *   - each line is `title[,description[,sortOrder]]` — commas inside
 *     quoted fields are respected via a light parser (no third-party
 *     CSV library)
 *   - the FIRST row is treated as data unless its first field equals
 *     `title` (case-insensitive) — then it's a header and gets skipped
 *
 * All parsed rows are stamped with the current (subjectId, examType,
 * formLevel) — the operator only supplies title/description in the
 * paste, keeping the UI intuitive.
 */
function parseBulk(
  text: string,
  ctx: { subjectId: string; examType: string; formLevel: number },
): Array<{
  subjectId: string;
  examType: string;
  formLevel: number;
  title: string;
  description: string | null;
  sortOrder?: number;
}> {
  const trimmed = text.trim();
  if (!trimmed) return [];

  // JSON path — either `[{title, ...}, ...]` or `{items: [...]}`.
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      const arr = Array.isArray(parsed)
        ? parsed
        : parsed &&
            typeof parsed === "object" &&
            Array.isArray((parsed as { items?: unknown }).items)
          ? ((parsed as { items: unknown[] }).items)
          : [];
      return arr
        .map((raw) => {
          const item = raw as {
            title?: unknown;
            description?: unknown;
            sortOrder?: unknown;
            formLevel?: unknown;
          };
          const title =
            typeof item.title === "string" ? item.title.trim() : "";
          if (!title) return null;
          const description =
            typeof item.description === "string"
              ? item.description.trim() || null
              : null;
          const sortOrder =
            typeof item.sortOrder === "number" ? item.sortOrder : undefined;
          // Trust the drawer's active tab for formLevel; JSON payloads
          // that lie about it are silently overridden to match ctx.
          return {
            subjectId: ctx.subjectId,
            examType: ctx.examType,
            formLevel: ctx.formLevel,
            title,
            description,
            sortOrder,
          };
        })
        .filter(
          (r): r is NonNullable<typeof r> => r !== null,
        );
    } catch {
      // Fall through to CSV — the operator may have pasted CSV that
      // coincidentally starts with `[` (unlikely but tolerated).
    }
  }

  // CSV path. Header detection: skip first line iff its first field is
  // literally "title".
  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const first = splitCsvLine(lines[0]);
  const startIndex =
    (first[0] ?? "").trim().toLowerCase() === "title" ? 1 : 0;

  const rows: ReturnType<typeof parseBulk> = [];
  for (let i = startIndex; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const title = (cols[0] ?? "").trim();
    if (!title) continue;
    const description = (cols[1] ?? "").trim() || null;
    const sortRaw = cols[2];
    const sortOrder =
      sortRaw !== undefined && sortRaw.trim() !== ""
        ? Number(sortRaw.trim())
        : undefined;
    rows.push({
      subjectId: ctx.subjectId,
      examType: ctx.examType,
      formLevel: ctx.formLevel,
      title,
      description,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : undefined,
    });
  }
  return rows;
}

/**
 * Tiny CSV splitter with double-quote support. Not a general-purpose
 * CSV parser — good enough for the "paste from spreadsheet" flow.
 * Handles `"a,b",c` correctly and unescapes `""` inside a quoted field.
 */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
  }
  out.push(cur);
  return out;
}
