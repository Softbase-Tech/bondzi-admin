"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Check, Pencil, Sparkles, X } from "lucide-react";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { usePagination } from "@/hooks/use-pagination";
import { formatNumber, truncate } from "@/lib/utils";
import { PageHeader } from "@/components/admin/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExamTypeToggle } from "@/components/admin/shared/exam-type-toggle";
import { DifficultyBadge } from "@/components/admin/questions/difficulty-badge";
import { ReviewEditSheet } from "@/components/admin/pm-test/review-edit-sheet";
import { TablePager } from "@/components/admin/shared/table-pager";
import type {
  AiGenerationJob,
  ExamType,
  Paginated,
  PmTestQuestion,
  Subject,
} from "@/types/api";

interface Stats {
  pending: number;
  approvedToday: number;
  rejectedToday: number;
}

export default function PmTestReviewPage() {
  const qc = useQueryClient();
  const { page, limit, setPage } = usePagination(25);

  const [examType, setExamTypeRaw] = useState<ExamType>("wassce");
  const [formLevel, setFormLevelRaw] = useState<string>("all");
  const [subjectId, setSubjectIdRaw] = useState<string>("all");
  const [batch, setBatchRaw] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<PmTestQuestion | null>(null);

  // Any filter change invalidates the current page cursor — otherwise
  // switching from a queue with 10 pages to one with 2 leaves the
  // reviewer stranded on an empty "page 5" and looks like a bug.
  const setExamType = (v: ExamType) => {
    setExamTypeRaw(v);
    setPage(1);
  };
  const setFormLevel = (v: string) => {
    setFormLevelRaw(v);
    setPage(1);
  };
  const setSubjectId = (v: string) => {
    setSubjectIdRaw(v);
    setPage(1);
  };
  const setBatch = (v: string) => {
    setBatchRaw(v);
    setPage(1);
  };

  const activeFilterCount =
    (formLevel !== "all" ? 1 : 0) +
    (subjectId !== "all" ? 1 : 0) +
    (batch !== "all" ? 1 : 0);
  const clearAllFilters = () => {
    setFormLevelRaw("all");
    setSubjectIdRaw("all");
    setBatchRaw("all");
    setPage(1);
  };

  const filters = useMemo(
    () => ({
      examType,
      formLevel: formLevel === "all" ? undefined : Number(formLevel),
      subjectId: subjectId === "all" ? undefined : subjectId,
      batch: batch === "all" ? undefined : batch,
      page,
      limit,
    }),
    [examType, formLevel, subjectId, batch, page, limit],
  );

  const { data: subjects } = useQuery({
    queryKey: QK.SUBJECTS_LIST({ examType }),
    queryFn: () =>
      unwrap<Subject[]>(api.get("/subjects", { params: { examType } })),
  });

  const { data: batches } = useQuery({
    queryKey: QK.AI_GENERATION_JOBS({
      jobType: "pm_test_generation",
      limit: 25,
    }),
    queryFn: () =>
      unwrap<AiGenerationJob[]>(
        api.get("/admin/ai-generation/jobs", {
          params: { jobType: "pm_test_generation", limit: 25 },
        }),
      ),
  });

  // Stats endpoint isn't implemented on the backend yet (admin-pm-test
  // service exposes preview/generate/listReview/bulkReview/publish/archive
  // and nothing else). Silence the 404 spam instead of firing a bad
  // request every 30 seconds — the three cards fall back to a
  // best-effort derived count using the paginated list total below.
  //
  // When backend adds GET /admin/pm-test/review/stats, drop the
  // `enabled: false` and delete the fallback derivation.
  const { data: stats } = useQuery({
    queryKey: QK.PM_TEST_STATS(),
    queryFn: () => unwrap<Stats>(api.get("/admin/pm-test/review/stats")),
    refetchInterval: 30_000,
    enabled: false,
  });

  const { data, isLoading } = useQuery({
    queryKey: QK.PM_TEST_REVIEW_LIST(filters),
    queryFn: () =>
      unwrap<Paginated<PmTestQuestion>>(
        api.get("/admin/pm-test/review", { params: filters }),
      ),
  });

  // Backend contract: PATCH /admin/pm-test/review/bulk with a single
  // `{ items: [{ id, action }] }` body. The old
  // `POST /admin/pm-test/review/bulk-{action}` route never existed on
  // the server and 404'd on every click.
  const bulkMut = useMutation({
    mutationFn: (action: "approve" | "reject") =>
      unwrap(
        api.patch("/admin/pm-test/review/bulk", {
          items: Array.from(selected).map((id) => ({ id, action })),
        }),
      ),
    onSuccess: (_, action) => {
      toast.success(`${selected.size} ${action}d`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["pm-test"] });
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Bulk action failed"),
  });

  // Backend contract: single-row approve is `POST /admin/pm-test/publish/:id`,
  // single-row reject is `DELETE /admin/pm-test/:id` (archive).
  // The old `POST /admin/pm-test/review/:id/{approve|reject}` shape
  // was the "Cannot POST" 404 shown on the UI when the reviewer hit
  // the green tick / red X.
  const rowMut = useMutation({
    mutationFn: (args: { id: string; action: "approve" | "reject" }) => {
      if (args.action === "approve") {
        return unwrap(api.post(`/admin/pm-test/publish/${args.id}`, {}));
      }
      return unwrap(api.delete(`/admin/pm-test/${args.id}`));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pm-test"] });
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Action failed"),
  });

  // Spot-check endpoint isn't implemented on the backend yet. Rather
  // than 404 silently on tap, the button below is disabled with a
  // tooltip; re-enable it (and drop this stub) when the endpoint
  // lands.
  const spotCheckMut = {
    mutate: () =>
      toast.error("Spot-check isn't wired to the backend yet."),
    isPending: false as const,
  };

  const toggleAll = () => {
    if (!data) return;
    if (selected.size === data.items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(data.items.map((i) => i.id)));
    }
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirmBulk = (action: "approve" | "reject") => {
    if (selected.size === 0) return;
    if (
      !window.confirm(
        `${action === "approve" ? "Approve" : "Reject"} ${selected.size} questions?`,
      )
    ) {
      return;
    }
    bulkMut.mutate(action);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Level Test review queue"
        description="AI-generated questions awaiting admin approval before they go live."
        actions={
          <Button
            variant="outline"
            disabled
            title="Spot-check endpoint isn't wired to the backend yet"
            onClick={() => spotCheckMut.mutate()}
          >
            <Sparkles className="h-4 w-4" /> Spot-check 10%
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Pending
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {/* Fallback while GET /admin/pm-test/review/stats is
                unimplemented: derive from the paginated list total.
                It counts pending items in the current filter, which
                matches what the reviewer sees below and is at least
                truthful. */}
            {data?.total === undefined ? (
              <Skeleton className="h-7 w-14" />
            ) : (
              <>
                {formatNumber(stats?.pending ?? data.total)}{" "}
                {(stats?.pending ?? data.total) > 0 && (
                  <Badge variant="warning" className="ml-2 align-middle">
                    needs review
                  </Badge>
                )}
              </>
            )}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Approved today
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {formatNumber(stats?.approvedToday ?? 0)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Rejected today
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {formatNumber(stats?.rejectedToday ?? 0)}
          </div>
        </Card>
      </div>

      <Card className="p-4 flex flex-wrap items-end gap-3">
        <div>
          <div className="text-xs text-slate-500 mb-1">Exam type</div>
          <ExamTypeToggle value={examType} onChange={setExamType} />
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">Form level</div>
          <Select value={formLevel} onValueChange={setFormLevel}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              <SelectItem value="1">Form 1</SelectItem>
              <SelectItem value="2">Form 2</SelectItem>
              <SelectItem value="3">Form 3</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">Subject</div>
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subjects</SelectItem>
              {subjects?.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">Batch</div>
          <Select value={batch} onValueChange={setBatch}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All batches</SelectItem>
              {batches?.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.createdAt.slice(0, 10)} · {b.id.slice(0, 6)}
                  {b.triggeredByName ? ` · ${b.triggeredByName}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-xs"
          >
            Clear all
          </Button>
        )}

        {selected.size > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-slate-600">
              {selected.size} selected
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => confirmBulk("approve")}
              loading={bulkMut.isPending}
            >
              <Check className="h-4 w-4" /> Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => confirmBulk("reject")}
              loading={bulkMut.isPending}
            >
              <X className="h-4 w-4" /> Reject
            </Button>
          </div>
        )}
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <Checkbox
                  checked={
                    (data?.items.length ?? 0) > 0 &&
                    selected.size === data?.items.length
                  }
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>Question</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead className="text-right">Options</TableHead>
              <TableHead>Expl.</TableHead>
              <TableHead>Verified</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={10}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : (data?.items ?? []).map((q) => (
                  <TableRow key={q.id}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(q.id)}
                        onCheckedChange={() => toggle(q.id)}
                      />
                    </TableCell>
                    <TableCell className="max-w-sm text-sm text-slate-800">
                      {truncate(q.body, 80)}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {q.subject?.name ?? q.subjectId.slice(0, 6)}
                    </TableCell>
                    <TableCell className="text-sm">F{q.formLevel}</TableCell>
                    <TableCell>
                      <DifficultyBadge value={q.difficulty} />
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {q.options.length}
                    </TableCell>
                    <TableCell>
                      {q.explanation ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <X className="h-4 w-4 text-slate-300" />
                      )}
                    </TableCell>
                    <TableCell>
                      <VerificationBadge status={q.verificationStatus} />
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-slate-500">
                      {q.generationBatchId
                        ? q.generationBatchId.slice(0, 8)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-emerald-700 hover:bg-emerald-50"
                          onClick={() =>
                            rowMut.mutate({ id: q.id, action: "approve" })
                          }
                          title="Approve"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-rose-700 hover:bg-rose-50"
                          onClick={() =>
                            rowMut.mutate({ id: q.id, action: "reject" })
                          }
                          title="Reject"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditing(q)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            {!isLoading && (data?.items.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="py-10 text-center text-slate-500">
                  Queue is empty.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <CardContent>
          <TablePager
            page={page}
            limit={limit}
            itemCount={data?.items.length ?? 0}
            total={data?.total ?? null}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>

      <ReviewEditSheet
        question={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
      />
    </div>
  );
}

/**
 * Answer-key verification outcome badge. `agreed` means an independent
 * verifier pass reached the same key; `key_mismatch` flags rows the
 * reviewer should scrutinise before approving. Rows generated before
 * verification existed carry null and render as a plain dash.
 */
function VerificationBadge({
  status,
}: {
  status: PmTestQuestion["verificationStatus"];
}) {
  switch (status) {
    case "agreed":
      return <Badge variant="success">agreed</Badge>;
    case "key_mismatch":
      return <Badge variant="destructive">key mismatch</Badge>;
    case "verifier_error":
      return <Badge variant="warning">verifier error</Badge>;
    default:
      return <span className="text-slate-300">—</span>;
  }
}
