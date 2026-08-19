"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ArrowLeft, Check, Copy, Save, Trash2 } from "lucide-react";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { PageHeader } from "@/components/admin/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DifficultyBadge } from "@/components/admin/questions/difficulty-badge";
import { formatDateTime } from "@/lib/utils";
import type { Difficulty, PmTestQuestion } from "@/types/api";

/**
 * Level Test question detail + edit page.
 *
 * Read-side: full stem, options, explanation, syllabus topic, batch
 * provenance. Everything the reviewer needs to decide "publish this".
 *
 * Write-side: surgical PATCH. Only the fields the reviewer changed
 * ship — the "options" array is all-or-nothing (replace the whole
 * set) because a partial option edit would break the answer-key
 * invariant. The backend enforces one-correct + 4-unique-labels +
 * 4-unique-bodies before writing.
 *
 * Actions bar: Publish, Archive, Delete (destructive), Copy id, Back.
 * Publish is idempotent (no-op if already active), Archive flips to
 * archived without deleting, Delete is a hard remove — different from
 * archive because a mis-generated row an admin never wants to see
 * again shouldn't clutter Archive filters.
 */
export default function LevelTestDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: QK.PM_TEST_DETAIL(id),
    queryFn: () =>
      unwrap<PmTestQuestion>(api.get(`/admin/pm-test/${id}`)),
    enabled: Boolean(id),
  });

  const [draft, setDraft] = useState<Draft | null>(null);
  useEffect(() => {
    if (data && !draft) {
      // Seed once when data first arrives. Subsequent refetches
      // (invalidations) don't overwrite an in-progress edit — that
      // would silently drop the reviewer's typing.
      setDraft(toDraft(data));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const dirty = useMemo(() => {
    if (!data || !draft) return false;
    return draftDirty(data, draft);
  }, [data, draft]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["pm-test"] });
    qc.invalidateQueries({ queryKey: QK.PM_TEST_DETAIL(id) });
  };

  const saveMut = useMutation({
    mutationFn: () => {
      if (!draft) throw new Error("nothing to save");
      const payload = diffPayload(data!, draft);
      return unwrap<PmTestQuestion>(api.patch(`/admin/pm-test/${id}`, payload));
    },
    onSuccess: () => {
      toast.success("Saved");
      invalidate();
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Save failed"),
  });

  const publishMut = useMutation({
    mutationFn: () => unwrap(api.post(`/admin/pm-test/publish/${id}`, {})),
    onSuccess: () => {
      toast.success("Published");
      invalidate();
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Publish failed"),
  });

  const archiveMut = useMutation({
    mutationFn: () => unwrap(api.delete(`/admin/pm-test/${id}`)),
    onSuccess: () => {
      toast.success("Archived");
      invalidate();
      router.push("/admin/level-tests");
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Archive failed"),
  });

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(id);
      toast.success("Copied id");
    } catch {
      toast.error("Copy failed");
    }
  };

  if (isError)
    return (
      <div className="p-6 text-sm text-rose-700">
        Question not found. <Link href="/admin/level-tests">Back to list</Link>
      </div>
    );
  if (isLoading || !data || !draft)
    return (
      <div className="p-6">
        <Skeleton className="h-6 w-40 mb-4" />
        <Skeleton className="h-40 w-full" />
      </div>
    );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Level Test question"
        description={`Batch ${data.generationBatchId ? data.generationBatchId.slice(0, 8) : "manual"} · ${formatDateTime(data.createdAt)}`}
        actions={
          <>
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button variant="outline" onClick={copyId} title={id}>
              <Copy className="h-4 w-4" /> Copy id
            </Button>
            {data.status !== "active" && (
              <Button
                variant="outline"
                className="text-emerald-700"
                onClick={() => publishMut.mutate()}
                loading={publishMut.isPending}
              >
                <Check className="h-4 w-4" /> Publish
              </Button>
            )}
            {data.status !== "archived" && (
              <Button
                variant="destructive"
                onClick={() => {
                  if (window.confirm("Archive this question?"))
                    archiveMut.mutate();
                }}
                loading={archiveMut.isPending}
              >
                <Trash2 className="h-4 w-4" /> Archive
              </Button>
            )}
            <Button
              onClick={() => saveMut.mutate()}
              disabled={!dirty}
              loading={saveMut.isPending}
            >
              <Save className="h-4 w-4" /> Save
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-4 lg:col-span-2 space-y-4">
          <div className="flex items-center gap-3">
            <DifficultyBadge value={draft.difficulty} />
            <StatusBadge status={data.status} />
            <span className="text-xs text-slate-500">
              F{data.formLevel} · {data.subject?.name ?? data.subjectId.slice(0, 6)} ·{" "}
              {data.examType.toUpperCase()}
            </span>
          </div>

          <FieldLabel>Question stem</FieldLabel>
          <Textarea
            value={draft.body}
            onChange={(e) =>
              setDraft((d) => (d ? { ...d, body: e.target.value } : d))
            }
            rows={4}
            placeholder="The full question text students see."
          />

          <div className="space-y-3">
            <FieldLabel>Options — mark exactly one as correct</FieldLabel>
            {draft.options.map((opt, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex flex-col items-center gap-1 pt-2">
                  <span className="w-6 text-center font-nunito-bold text-slate-500">
                    {opt.label}
                  </span>
                  <input
                    type="radio"
                    name="correct"
                    checked={opt.isCorrect}
                    onChange={() =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              options: d.options.map((o, j) => ({
                                ...o,
                                isCorrect: j === i,
                              })),
                            }
                          : d,
                      )
                    }
                    aria-label={`Mark option ${opt.label} correct`}
                    className="h-4 w-4 accent-emerald-600"
                  />
                </div>
                <Textarea
                  value={opt.body}
                  onChange={(e) =>
                    setDraft((d) =>
                      d
                        ? {
                            ...d,
                            options: d.options.map((o, j) =>
                              j === i ? { ...o, body: e.target.value } : o,
                            ),
                          }
                        : d,
                    )
                  }
                  rows={2}
                  className={
                    opt.isCorrect
                      ? "border-emerald-300 bg-emerald-50/30"
                      : undefined
                  }
                />
              </div>
            ))}
          </div>

          <FieldLabel>Explanation</FieldLabel>
          <Textarea
            value={draft.explanation}
            onChange={(e) =>
              setDraft((d) =>
                d ? { ...d, explanation: e.target.value } : d,
              )
            }
            rows={6}
            placeholder="Why the correct answer is right. Shown to students after they answer."
          />
        </Card>

        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <FieldLabel>Difficulty</FieldLabel>
            <Select
              value={draft.difficulty}
              onValueChange={(v) =>
                setDraft((d) =>
                  d ? { ...d, difficulty: v as Difficulty } : d,
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>

            <FieldLabel>Syllabus topic id</FieldLabel>
            <Input
              value={draft.syllabusTopicId ?? ""}
              onChange={(e) =>
                setDraft((d) =>
                  d
                    ? {
                        ...d,
                        syllabusTopicId: e.target.value.trim() || null,
                      }
                    : d,
                )
              }
              placeholder="uuid (or empty)"
              className="font-mono text-xs"
            />
          </Card>

          <Card className="p-4 space-y-2 text-xs text-slate-500">
            <div className="font-semibold uppercase tracking-wide text-slate-500">
              Provenance
            </div>
            <div>
              <span className="text-slate-500">Batch:</span>{" "}
              <span className="font-mono">
                {data.generationBatchId ?? "manual upload"}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Created:</span>{" "}
              {formatDateTime(data.createdAt)}
            </div>
            <div>
              <span className="text-slate-500">Answered:</span>{" "}
              {data.timesAnswered.toLocaleString()} times
              {data.timesAnswered > 0 && (
                <>
                  {" "}
                  ·{" "}
                  {Math.round(
                    (data.timesCorrect / data.timesAnswered) * 100,
                  )}
                  % accuracy
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

interface DraftOption {
  label: string;
  body: string;
  isCorrect: boolean;
}
interface Draft {
  body: string;
  explanation: string;
  difficulty: Difficulty;
  syllabusTopicId: string | null;
  options: DraftOption[];
}

function toDraft(q: PmTestQuestion): Draft {
  const byLabel = new Map(q.options.map((o) => [o.label, o]));
  const labels = ["A", "B", "C", "D"];
  const options = labels.map((l) => {
    const o = byLabel.get(l);
    return {
      label: l,
      body: o?.body ?? "",
      isCorrect: !!o?.isCorrect,
    };
  });
  return {
    body: q.body,
    explanation: q.explanation ?? "",
    difficulty: q.difficulty,
    syllabusTopicId: q.syllabusTopicId,
    options,
  };
}

function draftDirty(orig: PmTestQuestion, draft: Draft): boolean {
  if (draft.body !== orig.body) return true;
  if ((draft.explanation || "") !== (orig.explanation ?? "")) return true;
  if (draft.difficulty !== orig.difficulty) return true;
  if ((draft.syllabusTopicId ?? null) !== (orig.syllabusTopicId ?? null))
    return true;
  const origMap = new Map(orig.options.map((o) => [o.label, o]));
  for (const d of draft.options) {
    const o = origMap.get(d.label);
    if (!o) return true;
    if (o.body !== d.body || o.isCorrect !== d.isCorrect) return true;
  }
  return false;
}

/**
 * Only send the fields the reviewer actually changed. Options are
 * all-or-nothing (backend enforces one-correct + 4-unique-labels);
 * everything else is a scalar field.
 */
function diffPayload(orig: PmTestQuestion, draft: Draft) {
  const out: Record<string, unknown> = {};
  if (draft.body !== orig.body) out.body = draft.body;
  if ((draft.explanation || "") !== (orig.explanation ?? ""))
    out.explanation = draft.explanation;
  if (draft.difficulty !== orig.difficulty) out.difficulty = draft.difficulty;
  if ((draft.syllabusTopicId ?? null) !== (orig.syllabusTopicId ?? null))
    out.syllabusTopicId = draft.syllabusTopicId;
  // Options: any per-cell change ships the whole array.
  const origMap = new Map(orig.options.map((o) => [o.label, o]));
  const optionsDirty = draft.options.some((d) => {
    const o = origMap.get(d.label);
    return !o || o.body !== d.body || o.isCorrect !== d.isCorrect;
  });
  if (optionsDirty) out.options = draft.options;
  return out;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "active") return <Badge variant="success">Live</Badge>;
  if (status === "pending_review")
    return <Badge variant="warning">Pending</Badge>;
  if (status === "archived") return <Badge variant="outline">Archived</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}
