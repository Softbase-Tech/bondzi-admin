"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ArrowLeft, Check, Copy, Save, Sparkles, Trash2 } from "lucide-react";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { PageHeader } from "@/components/admin/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MathEditor } from "@/components/admin/questions/math-editor";
import { formatDateTime } from "@/lib/utils";
import type {
  Difficulty,
  PmTestQuestion,
  Subject,
  SyllabusTopic,
} from "@/types/api";

/**
 * Level Test question detail + edit page.
 *
 * Mirrors the Question bank detail layout so admins moving between
 * past-paper and Level Test items don't have to relearn the interface.
 * Same shell — 3-column Question body / 2-column Metadata / bottom
 * AI Explanation section.
 *
 * What differs from Question bank:
 *   • No Year / Paper / Source / Image URL / Shared stimulus —
 *     Level Test items aren't dated exam papers.
 *   • No Add / Delete on options — WAEC MCQ shape is exactly 4 and
 *     the answer-key invariant is enforced server-side.
 *   • Metadata card carries Exam type / Subject / Form level as
 *     read-only fields (they're structural properties of the
 *     generated row, not admin-mutable), plus editable Topic and
 *     Difficulty dropdowns.
 *   • AI Explanation section shows the current explanation with the
 *     same Markdown + LaTeX helper the QB uses; the generation
 *     provenance line reads "generated inline at batch creation"
 *     rather than the eu.anthropic model label because pm_test rows
 *     don't carry an `explanation_model` column.
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

  const topicsQ = useQuery({
    queryKey: QK.SYLLABUS_TOPICS({
      examType: data?.examType,
      subjectId: data?.subjectId,
      formLevel: data?.formLevel,
    }),
    queryFn: () =>
      unwrap<SyllabusTopic[]>(
        api.get("/syllabus-topics", {
          params: {
            examType: data?.examType,
            subjectId: data?.subjectId,
            formLevel: data?.formLevel,
          },
        }),
      ),
    enabled: Boolean(data?.subjectId),
  });

  const subjectQ = useQuery({
    queryKey: QK.SUBJECTS_LIST({ examType: data?.examType }),
    queryFn: () =>
      unwrap<Subject[]>(
        api.get("/subjects", { params: { examType: data?.examType } }),
      ),
    enabled: Boolean(data?.examType),
  });

  const [draft, setDraft] = useState<Draft | null>(null);
  useEffect(() => {
    if (data && !draft) setDraft(toDraft(data));
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

  // Synchronous regenerate — the backend takes one Bedrock round-trip
  // (~10s on Haiku, ~30s on Sonnet) and writes the new explanation
  // straight to the row. The mutation replaces the draft's
  // explanation with the fresh text so the reviewer sees the change
  // immediately and can further edit if they want.
  const regenerateMut = useMutation({
    mutationFn: (model: "claude-haiku" | "claude-sonnet") =>
      unwrap<PmTestQuestion>(
        api.post(`/admin/pm-test/${id}/regenerate-explanation`, { model }),
      ),
    onSuccess: (fresh) => {
      toast.success("Explanation regenerated");
      setDraft((d) =>
        d ? { ...d, explanation: fresh.explanation ?? "" } : d,
      );
      invalidate();
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Regenerate failed"),
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
        Question not found.{" "}
        <Link href="/admin/level-tests" className="underline">
          Back to list
        </Link>
      </div>
    );
  if (isLoading || !data || !draft)
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-40 w-full" />
      </div>
    );

  const subjectName =
    data.subject?.name ??
    subjectQ.data?.find((s) => s.id === data.subjectId)?.name ??
    data.subjectId.slice(0, 8);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Edit Level Test question"
        description={`Changes are audit-logged. Batch ${data.generationBatchId ? data.generationBatchId.slice(0, 8) : "manual"} · ${formatDateTime(data.createdAt)}`}
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

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (dirty) saveMut.mutate();
        }}
        className="grid grid-cols-1 lg:grid-cols-5 gap-6"
      >
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Question body</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <StatusBadge status={data.status} />
              <span className="text-xs text-slate-500">
                F{data.formLevel} · {subjectName} ·{" "}
                {data.examType.toUpperCase()}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="body">Question (Markdown + LaTeX math)</Label>
              <MathEditor
                id="body"
                value={draft.body}
                onChange={(v) =>
                  setDraft((d) => (d ? { ...d, body: v } : d))
                }
                rows={6}
                placeholder="State the full question as students will see it. Wrap math in $…$ — e.g. Simplify $\dfrac{5^7 \times 5^4}{5^2}$"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>Options — mark exactly one as correct</Label>
                <span className="text-xs text-slate-500">
                  WAEC MCQ shape is fixed at 4 options
                </span>
              </div>
              {draft.options.map((opt, i) => (
                <div
                  key={i}
                  className={
                    "flex flex-col gap-2 rounded-md border p-2 " +
                    (opt.isCorrect
                      ? "border-emerald-300 bg-emerald-50/40"
                      : "border-slate-200 bg-slate-50")
                  }
                >
                  <div className="flex items-center gap-2">
                    <Input
                      className="w-12 text-center uppercase"
                      value={opt.label}
                      readOnly
                    />
                    <label className="flex items-center gap-1 whitespace-nowrap text-xs text-slate-600">
                      <Checkbox
                        checked={opt.isCorrect}
                        onCheckedChange={(v) => {
                          const next = v === true;
                          setDraft((d) =>
                            d
                              ? {
                                  ...d,
                                  options: d.options.map((o, j) =>
                                    j === i
                                      ? { ...o, isCorrect: next }
                                      : next
                                        ? { ...o, isCorrect: false }
                                        : o,
                                  ),
                                }
                              : d,
                          );
                        }}
                      />
                      Correct
                    </label>
                  </div>
                  <MathEditor
                    compact
                    value={opt.body}
                    onChange={(v) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              options: d.options.map((o, j) =>
                                j === i ? { ...o, body: v } : o,
                              ),
                            }
                          : d,
                      )
                    }
                    placeholder={`Option ${opt.label} body — wrap math in $…$`}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Exam type</Label>
                <Input value={data.examType.toUpperCase()} readOnly />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Form level</Label>
                <Input value={`Form ${data.formLevel}`} readOnly />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Subject</Label>
              <Input value={subjectName} readOnly />
              <p className="text-[11px] text-slate-500">
                Exam type / subject / form are set at generation and can&apos;t
                be edited here. Archive and regenerate to change them.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label>Syllabus topic</Label>
                {draft.syllabusTopicId && (
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((d) =>
                        d ? { ...d, syllabusTopicId: null } : d,
                      )
                    }
                    className="text-xs text-pm-orange hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
              <Select
                value={draft.syllabusTopicId ?? "none"}
                onValueChange={(v) =>
                  setDraft((d) =>
                    d
                      ? { ...d, syllabusTopicId: v === "none" ? null : v }
                      : d,
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="No topic" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="none">No topic</SelectItem>
                  {(topicsQ.data ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {draft.syllabusTopicId ? (
                <p className="font-mono text-[11px] text-slate-500">
                  {draft.syllabusTopicId}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Difficulty</Label>
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
            </div>

            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 space-y-1">
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
                    {" · "}
                    {Math.round(
                      (data.timesCorrect / data.timesAnswered) * 100,
                    )}
                    % accuracy
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="flex-1">
              <CardTitle>AI Explanation</CardTitle>
              <p className="mt-1 text-xs text-slate-500">
                Markdown, `$…$` LaTeX allowed. Regenerate to overwrite with
                a fresh AI pass, or edit the text below manually.
              </p>
            </div>
            <div className="flex flex-shrink-0 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                loading={regenerateMut.isPending}
                onClick={() => regenerateMut.mutate("claude-haiku")}
              >
                <Sparkles className="h-3.5 w-3.5" /> Regenerate (Haiku)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                loading={regenerateMut.isPending}
                onClick={() => regenerateMut.mutate("claude-sonnet")}
              >
                <Sparkles className="h-3.5 w-3.5" /> Regenerate (Sonnet)
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <MathEditor
              value={draft.explanation}
              onChange={(v) =>
                setDraft((d) => (d ? { ...d, explanation: v } : d))
              }
              rows={10}
              placeholder="Why the correct answer is right. Walk through the reasoning; call out the specific concept in play; briefly note why each distractor is wrong."
            />
          </CardContent>
        </Card>
      </form>
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
    return { label: l, body: o?.body ?? "", isCorrect: !!o?.isCorrect };
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

function diffPayload(orig: PmTestQuestion, draft: Draft) {
  const out: Record<string, unknown> = {};
  if (draft.body !== orig.body) out.body = draft.body;
  if ((draft.explanation || "") !== (orig.explanation ?? ""))
    out.explanation = draft.explanation;
  if (draft.difficulty !== orig.difficulty) out.difficulty = draft.difficulty;
  if ((draft.syllabusTopicId ?? null) !== (orig.syllabusTopicId ?? null))
    out.syllabusTopicId = draft.syllabusTopicId;
  const origMap = new Map(orig.options.map((o) => [o.label, o]));
  const optionsDirty = draft.options.some((d) => {
    const o = origMap.get(d.label);
    return !o || o.body !== d.body || o.isCorrect !== d.isCorrect;
  });
  if (optionsDirty) out.options = draft.options;
  return out;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "active") return <Badge variant="success">Live</Badge>;
  if (status === "pending_review")
    return <Badge variant="warning">Pending</Badge>;
  if (status === "archived") return <Badge variant="outline">Archived</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}
