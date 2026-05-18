"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Filter, Plus, Search, Upload, X } from "lucide-react";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { usePagination } from "@/hooks/use-pagination";
import { PageHeader } from "@/components/admin/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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
import {
  DifficultyBadge,
  VerifiedBadge,
} from "@/components/admin/questions/difficulty-badge";
import { ExamTypeToggle } from "@/components/admin/shared/exam-type-toggle";
import { formatDate, truncate, percent } from "@/lib/utils";
import type {
  Difficulty,
  ExamType,
  Paginated,
  Question,
  QuestionSource,
  Subject,
} from "@/types/api";

/**
 * Question bank.
 *
 * Filter semantics:
 *   - URL is the single source of truth for what's currently filtering
 *     the table. Refresh + back/forward + shared-link reproduce the
 *     exact view.
 *   - Dropdowns + the exam-type toggle apply IMMEDIATELY (one click
 *     = one URL change = one refetch). Standard product convention
 *     for filter dropdowns.
 *   - Free-text search is the one exception: typing in the search
 *     input does NOT auto-fire. The query only changes when the
 *     admin presses Enter or clicks "Search".
 *   - On first mount with a bare URL, all filters resolve to "any"
 *     except exam type (defaults to WASSCE because students using
 *     the consumer app are exam-type scoped). The table loads
 *     immediately with no admin action required.
 */

type VerifiedFilter = "all" | "verified" | "unverified";
const ANY = "any" as const;

const YEAR_MIN = 1990;
const YEAR_MAX = new Date().getFullYear();
const YEARS: number[] = [];
for (let y = YEAR_MAX; y >= YEAR_MIN; y--) YEARS.push(y);

interface Filters {
  search: string;
  examType: ExamType;
  subjectId: string;
  year: string;
  difficulty: Difficulty | typeof ANY;
  source: QuestionSource | typeof ANY;
  verified: VerifiedFilter;
}

function readFromUrl(p: URLSearchParams | null): Filters {
  return {
    search: p?.get("search") ?? "",
    examType: (p?.get("examType") as ExamType | null) ?? "wassce",
    subjectId: p?.get("subjectId") ?? "",
    year: p?.get("year") ?? "",
    difficulty: (p?.get("difficulty") as Difficulty | null) ?? ANY,
    source: (p?.get("source") as QuestionSource | null) ?? ANY,
    verified: (p?.get("verified") as VerifiedFilter | null) ?? "all",
  };
}

function writeToUrl(f: Filters): URLSearchParams {
  const sp = new URLSearchParams();
  if (f.search) sp.set("search", f.search);
  sp.set("examType", f.examType);
  if (f.subjectId) sp.set("subjectId", f.subjectId);
  if (f.year) sp.set("year", f.year);
  if (f.difficulty !== ANY) sp.set("difficulty", f.difficulty);
  if (f.source !== ANY) sp.set("source", f.source);
  if (f.verified !== "all") sp.set("verified", f.verified);
  return sp;
}

export default function QuestionsPage() {
  const { page, limit, setPage } = usePagination(20);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  // Filters: derived from the URL on every render. Single source of
  // truth — the URL — drives the query, so this component never
  // gets out of sync with the address bar.
  const filters = readFromUrl(params);

  // Search box draft state — only commits to the URL on Enter/Submit.
  // All other filter inputs update the URL directly.
  const [searchDraft, setSearchDraft] = useState(filters.search);
  // Keep the draft in sync when the URL search changes externally
  // (back button, "Clear all", topbar global search navigation).
  useEffect(() => {
    setSearchDraft(filters.search);
  }, [filters.search]);

  const subjectsQ = useQuery({
    queryKey: QK.SUBJECTS_LIST({ examType: filters.examType }),
    queryFn: () =>
      unwrap<Subject[]>(
        api.get("/subjects", { params: { examType: filters.examType } }),
      ),
  });

  const { data, isLoading } = useQuery({
    queryKey: QK.QUESTIONS_LIST({ page, limit, ...filters }),
    queryFn: () => {
      const qp: Record<string, string | number | boolean> = {
        page,
        limit,
        examType: filters.examType,
      };
      if (filters.search) qp.search = filters.search;
      if (filters.subjectId) qp.subjectId = filters.subjectId;
      if (filters.year) qp.year = filters.year;
      if (filters.difficulty !== ANY) qp.difficulty = filters.difficulty;
      if (filters.source !== ANY) qp.source = filters.source;
      if (filters.verified !== "all")
        qp.isVerified = filters.verified === "verified";
      return unwrap<Paginated<Question>>(
        api.get("/questions", { params: qp }),
      );
    },
  });

  /**
   * Push a filter change into the URL. Used by every dropdown/toggle
   * (apply-on-change) AND by the search submit handler. Always
   * resets page to 1 so filter changes never land on a phantom
   * empty page; preserves `limit` (admin-chosen page size).
   */
  const apply = (next: Filters) => {
    const sp = writeToUrl(next);
    const currentLimit = params?.get("limit");
    if (currentLimit) sp.set("limit", currentLimit);
    sp.set("page", "1");
    router.replace(`${pathname}?${sp.toString()}`);
  };

  const onSubmitSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    apply({ ...filters, search: searchDraft });
  };

  const clearAll = () => {
    setSearchDraft("");
    apply({
      search: "",
      examType: "wassce",
      subjectId: "",
      year: "",
      difficulty: ANY,
      source: ANY,
      verified: "all",
    });
  };

  // Number of filters narrowing the result beyond the exam-type default.
  const activeCount =
    (filters.search ? 1 : 0) +
    (filters.subjectId ? 1 : 0) +
    (filters.year ? 1 : 0) +
    (filters.difficulty !== ANY ? 1 : 0) +
    (filters.source !== ANY ? 1 : 0) +
    (filters.verified !== "all" ? 1 : 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Question bank"
        description="Every question served to students. Search runs full-text against the Postgres GIN index."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/admin/questions/import">
                <Upload className="h-4 w-4" /> Bulk import
              </Link>
            </Button>
            <Button asChild>
              <Link href="/admin/questions/new">
                <Plus className="h-4 w-4" /> New question
              </Link>
            </Button>
          </>
        }
      />

      <Card className="p-4 space-y-4">
        {/* Exam type toggle on its own row. Switching exam type also
            drops the subject selection because the subject list is
            scoped to one exam type. */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <div className="text-xs text-slate-500 mb-1">Exam type</div>
            <ExamTypeToggle
              value={filters.examType}
              onChange={(et) =>
                apply({ ...filters, examType: et, subjectId: "" })
              }
            />
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
            <Filter className="h-3.5 w-3.5" />
            {activeCount > 0 ? (
              <>
                <span className="font-medium text-slate-700">
                  {activeCount}
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

        {/* Dropdowns — each one applies on change. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <FilterField label="Subject">
            <Select
              value={filters.subjectId || ANY}
              onValueChange={(v) =>
                apply({ ...filters, subjectId: v === ANY ? "" : v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any subject</SelectItem>
                {(subjectsQ.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Year">
            <Select
              value={filters.year || ANY}
              onValueChange={(v) =>
                apply({ ...filters, year: v === ANY ? "" : v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value={ANY}>Any year</SelectItem>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Difficulty">
            <Select
              value={filters.difficulty}
              onValueChange={(v) =>
                apply({
                  ...filters,
                  difficulty: v as Difficulty | typeof ANY,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any difficulty</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Source">
            <Select
              value={filters.source}
              onValueChange={(v) =>
                apply({
                  ...filters,
                  source: v as QuestionSource | typeof ANY,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any source</SelectItem>
                <SelectItem value="wassce_past">WASSCE past</SelectItem>
                <SelectItem value="bece_past">BECE past</SelectItem>
                <SelectItem value="ai_passmaster_test">
                  PM Test (AI)
                </SelectItem>
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Verification">
            <Select
              value={filters.verified}
              onValueChange={(v) =>
                apply({ ...filters, verified: v as VerifiedFilter })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any status</SelectItem>
                <SelectItem value="verified">Verified only</SelectItem>
                <SelectItem value="unverified">Unverified only</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
        </div>

        {/* Search — submit-only. Enter or click "Search" to fire. */}
        <form onSubmit={onSubmitSearch} className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-2xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Search questions — press Enter or click Search"
              className="pl-9 pr-9"
            />
            {searchDraft && (
              <button
                type="button"
                onClick={() => {
                  setSearchDraft("");
                  if (filters.search) apply({ ...filters, search: "" });
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Button type="submit">
            <Search className="h-4 w-4" /> Search
          </Button>
        </form>

        {filters.search && (
          <p className="text-xs text-slate-500">
            Showing results for{" "}
            <span className="font-medium text-slate-700">
              &ldquo;{filters.search}&rdquo;
            </span>
          </p>
        )}
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Question</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead>Verified</TableHead>
              <TableHead className="text-right">Flags</TableHead>
              <TableHead className="text-right">Answered</TableHead>
              <TableHead className="text-right">Accuracy</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={9}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : (data?.items ?? []).map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="max-w-md">
                      <Link
                        href={`/admin/questions/${q.id}`}
                        className="font-medium text-slate-900 hover:text-primary"
                      >
                        {truncate(q.body, 80)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {q.subject?.name ?? q.subjectId.slice(0, 8)}
                    </TableCell>
                    <TableCell>{q.year ?? "—"}</TableCell>
                    <TableCell>
                      <DifficultyBadge value={q.difficulty} />
                    </TableCell>
                    <TableCell>
                      <VerifiedBadge verified={q.isVerified} />
                    </TableCell>
                    <TableCell className="text-right">
                      {q.flagCount > 0 ? (
                        <span className="font-medium text-rose-600">
                          {q.flagCount}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {q.timesAnswered}
                    </TableCell>
                    <TableCell className="text-right text-slate-500">
                      {percent(q.timesCorrect, q.timesAnswered)}
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {formatDate(q.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
            {!isLoading && (data?.items.length ?? 0) === 0 && (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="py-12 text-center text-slate-500"
                >
                  No questions match your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          Showing {(data?.items.length ?? 0).toLocaleString()} of{" "}
          {(data?.total ?? 0).toLocaleString()} questions.
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={(data?.items.length ?? 0) < limit}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
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
