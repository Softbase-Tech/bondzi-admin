"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Check,
  Download,
  Sparkles,
  Upload as UploadIcon,
  X,
} from "lucide-react";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { usePagination } from "@/hooks/use-pagination";
import { formatNumber, truncate } from "@/lib/utils";
import { PageHeader } from "@/components/admin/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import { TablePager } from "@/components/admin/shared/table-pager";
import type {
  ExamType,
  Paginated,
  PmTestQuestion,
  Subject,
} from "@/types/api";

/**
 * Level Test bank — dedicated admin surface for pm_test_questions.
 * Splits Level Test out of the general Question bank (which is now
 * past-paper only) so the two flows can diverge without conditional
 * columns everywhere.
 *
 * What lives here:
 *   • Filters — exam type, subject, form level, difficulty, status
 *     (Live / Pending / Archived / Any), search over body+explanation,
 *     batch id, has-explanation, generation date range.
 *   • Row-level actions — publish, archive, edit (open detail page).
 *   • Bulk-select actions — publish, archive.
 *   • Export CSV of the current filter set (backend caps at 5000 rows).
 *   • Bulk upload button routes to /admin/level-tests/import.
 *
 * The pending-review workflow at /admin/pm-test/review stays as its
 * own dedicated screen — it's the "queue that needs eyes" view, and
 * this is the "browse the whole bank" view. Both hit the same table
 * but with different intents.
 */
type LevelTestStatus = "all" | "active" | "pending_review" | "archived";
type HasExpFilter = "all" | "yes" | "no";

export default function LevelTestsPage() {
  const qc = useQueryClient();
  const { page, limit, setPage } = usePagination(25);

  const [examType, setExamTypeRaw] = useState<ExamType>("wassce");
  const [subjectId, setSubjectIdRaw] = useState<string>("all");
  const [formLevel, setFormLevelRaw] = useState<string>("all");
  const [difficulty, setDifficultyRaw] = useState<string>("all");
  const [status, setStatusRaw] = useState<LevelTestStatus>("all");
  const [hasExplanation, setHasExplanationRaw] = useState<HasExpFilter>("all");
  const [batchId, setBatchIdRaw] = useState<string>("");
  const [createdFrom, setCreatedFromRaw] = useState<string>("");
  const [createdTo, setCreatedToRaw] = useState<string>("");
  const [searchDraft, setSearchDraft] = useState<string>("");
  const [searchApplied, setSearchApplied] = useState<string>("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Every filter setter also resets the page — the same fix we
  // applied across the admin pagination sweep.
  const setExamType = (v: ExamType) => {
    setExamTypeRaw(v);
    setSubjectIdRaw("all");
    setPage(1);
  };
  const setSubjectId = (v: string) => {
    setSubjectIdRaw(v);
    setPage(1);
  };
  const setFormLevel = (v: string) => {
    setFormLevelRaw(v);
    setPage(1);
  };
  const setDifficulty = (v: string) => {
    setDifficultyRaw(v);
    setPage(1);
  };
  const setStatus = (v: LevelTestStatus) => {
    setStatusRaw(v);
    setPage(1);
  };
  const setHasExplanation = (v: HasExpFilter) => {
    setHasExplanationRaw(v);
    setPage(1);
  };
  const setBatchId = (v: string) => {
    setBatchIdRaw(v);
    setPage(1);
  };
  const setCreatedFrom = (v: string) => {
    setCreatedFromRaw(v);
    setPage(1);
  };
  const setCreatedTo = (v: string) => {
    setCreatedToRaw(v);
    setPage(1);
  };
  const onSubmitSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    setSearchApplied(searchDraft.trim());
    setPage(1);
  };

  const activeFilterCount =
    (subjectId !== "all" ? 1 : 0) +
    (formLevel !== "all" ? 1 : 0) +
    (difficulty !== "all" ? 1 : 0) +
    (status !== "all" ? 1 : 0) +
    (hasExplanation !== "all" ? 1 : 0) +
    (batchId.trim() ? 1 : 0) +
    (createdFrom ? 1 : 0) +
    (createdTo ? 1 : 0) +
    (searchApplied ? 1 : 0);

  const clearAll = () => {
    setSubjectIdRaw("all");
    setFormLevelRaw("all");
    setDifficultyRaw("all");
    setStatusRaw("all");
    setHasExplanationRaw("all");
    setBatchIdRaw("");
    setCreatedFromRaw("");
    setCreatedToRaw("");
    setSearchDraft("");
    setSearchApplied("");
    setPage(1);
  };

  const params = useMemo(
    () => ({
      examType,
      subjectId: subjectId === "all" ? undefined : subjectId,
      formLevel: formLevel === "all" ? undefined : Number(formLevel),
      difficulty: difficulty === "all" ? undefined : difficulty,
      status: status === "all" ? undefined : status,
      hasExplanation:
        hasExplanation === "all" ? undefined : hasExplanation === "yes",
      batchId: batchId.trim() || undefined,
      createdFrom: createdFrom || undefined,
      createdTo: createdTo || undefined,
      search: searchApplied || undefined,
      page,
      limit,
    }),
    [
      examType,
      subjectId,
      formLevel,
      difficulty,
      status,
      hasExplanation,
      batchId,
      createdFrom,
      createdTo,
      searchApplied,
      page,
      limit,
    ],
  );

  const subjectsQ = useQuery({
    queryKey: QK.SUBJECTS_LIST({ examType }),
    queryFn: () =>
      unwrap<Subject[]>(api.get("/subjects", { params: { examType } })),
  });

  const { data, isLoading } = useQuery({
    queryKey: QK.PM_TEST_LIST(params),
    queryFn: () =>
      unwrap<Paginated<PmTestQuestion>>(
        api.get("/admin/pm-test/list", { params }),
      ),
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["pm-test"] });

  const rowMut = useMutation({
    mutationFn: (args: { id: string; action: "publish" | "archive" }) =>
      args.action === "publish"
        ? unwrap(api.post(`/admin/pm-test/publish/${args.id}`, {}))
        : unwrap(api.delete(`/admin/pm-test/${args.id}`)),
    onSuccess: (_, args) => {
      toast.success(args.action === "publish" ? "Published" : "Archived");
      invalidate();
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Action failed"),
  });

  const bulkMut = useMutation({
    mutationFn: (action: "approve" | "reject") =>
      unwrap(
        api.patch("/admin/pm-test/review/bulk", {
          items: Array.from(selected).map((id) => ({ id, action })),
        }),
      ),
    onSuccess: (_, action) => {
      toast.success(
        `${selected.size} ${action === "approve" ? "published" : "archived"}`,
      );
      setSelected(new Set());
      invalidate();
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Bulk action failed"),
  });

  const items = data?.items ?? [];
  const allSelected =
    items.length > 0 && items.every((q) => selected.has(q.id));
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(items.map((q) => q.id)));
  };
  const toggleOne = (id: string) => {
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
        `${action === "approve" ? "Publish" : "Archive"} ${selected.size} question${selected.size === 1 ? "" : "s"}?`,
      )
    )
      return;
    bulkMut.mutate(action);
  };

  // Export must go through the axios API client so the Bearer token
  // is attached — a plain `<a href download>` opens the URL as a
  // browser navigation, which sends no Authorization header, so the
  // backend returned 401. Fetch as blob → synthesize an anchor click
  // → revoke the object URL.
  const exportMut = useMutation({
    mutationFn: async () => {
      const exportParams: Record<string, string | number> = {};
      Object.entries(params).forEach(([key, value]) => {
        if (key === "page" || key === "limit") return;
        if (value === undefined || value === null || value === "") return;
        exportParams[key] =
          typeof value === "boolean" ? String(value) : (value as string | number);
      });
      const res = await api.get<Blob>("/admin/pm-test/export.csv", {
        params: exportParams,
        responseType: "blob",
      });
      return res.data;
    },
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `level-tests-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("CSV downloaded");
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Export failed"),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Level Test bank"
        description="All AI-generated Level Test questions across every status. Filter, publish, archive, export, bulk-import."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => exportMut.mutate()}
              loading={exportMut.isPending}
              title="Download the current filter set as CSV (max 5000 rows)"
            >
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button asChild>
              <Link href="/admin/level-tests/import">
                <UploadIcon className="h-4 w-4" /> Bulk upload
              </Link>
            </Button>
          </>
        }
      />

      <Card className="p-4 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <div className="text-xs text-slate-500 mb-1">Exam type</div>
            <ExamTypeToggle value={examType} onChange={setExamType} />
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
            {activeFilterCount > 0 ? (
              <>
                <span className="font-medium text-slate-700">
                  {activeFilterCount}
                </span>{" "}
                applied
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  className="h-6 px-2 text-xs"
                >
                  Clear all
                </Button>
              </>
            ) : (
              <span>No filters</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <FilterField label="Subject">
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All subjects</SelectItem>
                {(subjectsQ.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Form level">
            <Select value={formLevel} onValueChange={setFormLevel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All levels</SelectItem>
                <SelectItem value="1">Form 1</SelectItem>
                <SelectItem value="2">Form 2</SelectItem>
                <SelectItem value="3">Form 3</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Difficulty">
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any difficulty</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Status">
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as LevelTestStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any status</SelectItem>
                <SelectItem value="active">Live</SelectItem>
                <SelectItem value="pending_review">Pending review</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Explanation">
            <Select
              value={hasExplanation}
              onValueChange={(v) => setHasExplanation(v as HasExpFilter)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any</SelectItem>
                <SelectItem value="yes">Has explanation</SelectItem>
                <SelectItem value="no">Missing explanation</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Batch id">
            <Input
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              placeholder="UUID"
              className="font-mono text-xs"
            />
          </FilterField>

          <FilterField label="Created from">
            <Input
              type="date"
              value={createdFrom}
              onChange={(e) => setCreatedFrom(e.target.value)}
            />
          </FilterField>

          <FilterField label="Created to">
            <Input
              type="date"
              value={createdTo}
              onChange={(e) => setCreatedTo(e.target.value)}
            />
          </FilterField>
        </div>

        <form
          onSubmit={onSubmitSearch}
          className="flex flex-wrap items-center gap-2"
        >
          <Input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Search question body / explanation — Enter to run"
            className="flex-1 min-w-[240px] max-w-2xl"
          />
          <Button type="submit">Search</Button>
          {searchApplied && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchDraft("");
                setSearchApplied("");
                setPage(1);
              }}
            >
              Clear search
            </Button>
          )}
        </form>

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-primary/40 bg-accent/40 px-3 py-2">
            <span className="text-sm text-slate-700">
              {selected.size} selected
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => confirmBulk("approve")}
              loading={bulkMut.isPending}
            >
              <Check className="h-4 w-4" /> Publish
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => confirmBulk("reject")}
              loading={bulkMut.isPending}
            >
              <X className="h-4 w-4" /> Archive
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelected(new Set())}
              className="ml-auto"
            >
              Clear selection
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
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>Question</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Form</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Answered</TableHead>
              <TableHead className="text-right">Accuracy</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={10}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : items.map((q) => {
                  const accuracy =
                    q.timesAnswered > 0
                      ? `${Math.round((q.timesCorrect / q.timesAnswered) * 100)}%`
                      : "—";
                  return (
                    <TableRow key={q.id}>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(q.id)}
                          onCheckedChange={() => toggleOne(q.id)}
                        />
                      </TableCell>
                      <TableCell className="max-w-sm">
                        <Link
                          href={`/admin/level-tests/${q.id}`}
                          className="font-medium text-slate-900 hover:text-primary"
                        >
                          {truncate(q.body, 80)}
                        </Link>
                        {!q.explanation ? (
                          <div className="mt-1 text-[11px] text-amber-700">
                            no explanation
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {q.subject?.name ?? q.subjectId.slice(0, 6)}
                      </TableCell>
                      <TableCell className="text-sm">F{q.formLevel}</TableCell>
                      <TableCell>
                        <DifficultyBadge value={q.difficulty} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={q.status} />
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {formatNumber(q.timesAnswered)}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-slate-500">
                        {accuracy}
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-slate-500">
                        {q.generationBatchId
                          ? q.generationBatchId.slice(0, 8)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          {q.status !== "active" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-emerald-700 hover:bg-emerald-50"
                              title="Publish"
                              onClick={() =>
                                rowMut.mutate({ id: q.id, action: "publish" })
                              }
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          {q.status !== "archived" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-rose-700 hover:bg-rose-50"
                              title="Archive"
                              onClick={() =>
                                rowMut.mutate({ id: q.id, action: "archive" })
                              }
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
            {!isLoading && items.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="py-12 text-center text-slate-500"
                >
                  No Level Test questions match your filters.{" "}
                  <Link
                    href="/admin/pm-test/generate"
                    className="text-primary underline underline-offset-2"
                  >
                    Generate more →
                  </Link>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <TablePager
        page={page}
        limit={limit}
        itemCount={items.length}
        total={data?.total ?? null}
        onPageChange={setPage}
      />
    </div>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-slate-500">{label}</span>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "active") return <Badge variant="success">Live</Badge>;
  if (status === "pending_review")
    return <Badge variant="warning">Pending</Badge>;
  if (status === "archived") return <Badge variant="outline">Archived</Badge>;
  return (
    <Badge variant="outline">
      <Sparkles className="h-3 w-3" /> {status}
    </Badge>
  );
}
