"use client";

import { useMemo, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Pencil, Plus, ListTree, Archive } from "lucide-react";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { PageHeader } from "@/components/admin/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EXAM_TYPE_LABEL, EXAM_TYPE_TONE } from "@/lib/constants";
import { cn, formatNumber } from "@/lib/utils";
import type { ExamType, Subject } from "@/types/api";
import { SubjectFormModal } from "@/components/admin/subjects/subject-form-modal";
import { TopicsDrawer } from "@/components/admin/subjects/topics-drawer";

/**
 * /admin/subjects — full CRUD for subjects + nested topic management.
 *
 * Backend support:
 *   GET    /subjects?includeInactive=true     -> list (incl. disabled rows)
 *   POST   /subjects                          -> create
 *   PATCH  /subjects/:id                      -> update (name, category, isActive, sortOrder)
 *   DELETE /subjects/:id                      -> soft-delete (sets deleted_at)
 *   GET    /subjects/:id/topics               -> topics under a subject
 *   POST   /subjects/:id/topics               -> create topic
 *   PATCH  /subjects/topics/:topicId          -> update topic
 *   DELETE /subjects/topics/:topicId          -> soft-delete topic
 *
 * `code`, `examType`, `isCore` are immutable after create (they
 * partition the data model). To "rename" a code an admin must
 * archive the row and create a new one — keeps every question that
 * was tagged with the old code resolvable in history.
 */
export default function SubjectsPage() {
  const qc = useQueryClient();
  const [examFilter, setExamFilter] = useState<"all" | ExamType>("all");
  const [editing, setEditing] = useState<Subject | null>(null);
  const [creating, setCreating] = useState(false);
  const [topicsFor, setTopicsFor] = useState<Subject | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: QK.SUBJECTS_LIST({ admin: true }),
    queryFn: () =>
      unwrap<Subject[]>(
        api.get("/subjects", { params: { includeInactive: "true" } }),
      ),
  });

  const toggleActive = useMutation({
    mutationFn: (s: Subject) =>
      unwrap<Subject>(
        api.patch(`/subjects/${s.id}`, { isActive: !s.isActive }),
      ),
    onSuccess: (updated) => {
      toast.success(
        updated.isActive
          ? `${updated.name} is now visible to students.`
          : `${updated.name} is hidden from students.`,
      );
      qc.invalidateQueries({ queryKey: ["subjects"] });
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Update failed"),
  });

  const remove = useMutation({
    mutationFn: (s: Subject) =>
      api.delete(`/subjects/${s.id}`).then(() => s),
    onSuccess: (s) => {
      toast.success(
        `${s.name} archived. Existing questions still resolve; new students won't see it.`,
      );
      qc.invalidateQueries({ queryKey: ["subjects"] });
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Archive failed"),
  });

  // Partition by exam type so the table reads as two clearly-labelled
  // sections instead of a mixed list — admins almost always work on
  // one exam at a time.
  const filtered = useMemo(() => {
    const all = data ?? [];
    if (examFilter === "all") return all;
    return all.filter((s) => s.examType === examFilter);
  }, [data, examFilter]);

  const grouped = useMemo(() => {
    const m = new Map<ExamType, Subject[]>();
    for (const s of filtered) {
      const list = m.get(s.examType) ?? [];
      list.push(s);
      m.set(s.examType, list);
    }
    for (const list of m.values()) {
      list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    }
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Subjects"
        description="Manage the WAEC subject catalogue for BECE and WASSCE. Subjects partition the question bank; their topics partition further. Archived subjects stay queryable for history but disappear from the student app."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New subject
          </Button>
        }
      />

      <Card className="p-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500 mr-1">Exam type</span>
        {(["all", "bece", "wassce"] as const).map((opt) => (
          <Button
            key={opt}
            variant={examFilter === opt ? "default" : "outline"}
            size="sm"
            onClick={() => setExamFilter(opt as typeof examFilter)}
          >
            {opt === "all" ? "All" : EXAM_TYPE_LABEL[opt]}
          </Button>
        ))}
      </Card>

      {isLoading ? (
        <Card>
          <div className="p-6 flex flex-col gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </Card>
      ) : grouped.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-500">
          No subjects yet. Click <strong>New subject</strong> to add one.
        </Card>
      ) : (
        grouped.map(([examType, subjects]) => (
          <Card key={examType}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium",
                    EXAM_TYPE_TONE[examType],
                  )}
                >
                  {EXAM_TYPE_LABEL[examType]}
                </span>
                <span className="text-xs text-slate-500">
                  {subjects.length} subject{subjects.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Order</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Topics</TableHead>
                  <TableHead className="text-right">Questions</TableHead>
                  <TableHead>Visible</TableHead>
                  <TableHead className="w-48 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.map((s) => (
                  <TableRow
                    key={s.id}
                    className={s.isActive ? "" : "opacity-60"}
                  >
                    <TableCell className="font-mono text-xs text-slate-500">
                      {s.sortOrder}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">
                          {s.name}
                        </span>
                        {s.isCore && (
                          <Badge variant="outline" className="text-[10px]">
                            Core
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-slate-500">
                      {s.code}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {s.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatNumber(s.topicCount ?? 0)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatNumber(s.questionCount ?? 0)}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={s.isActive}
                        disabled={toggleActive.isPending}
                        onCheckedChange={() => toggleActive.mutate(s)}
                        aria-label={
                          s.isActive ? "Hide from students" : "Show to students"
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setTopicsFor(s)}
                          title="Manage topics"
                        >
                          <ListTree className="h-3.5 w-3.5" /> Topics
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditing(s)}
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={remove.isPending}
                          onClick={() => {
                            const ok = confirm(
                              `Archive "${s.name}"?\n\nThis hides the subject from students. Existing questions tagged with it stay queryable for history; new students won't see it on the catalogue.`,
                            );
                            if (ok) remove.mutate(s);
                          }}
                          title="Archive (soft delete)"
                        >
                          <Archive className="h-3.5 w-3.5 text-rose-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ))
      )}

      <SubjectFormModal
        mode={editing ? "edit" : "create"}
        subject={editing}
        open={editing !== null || creating}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
            setCreating(false);
          }
        }}
      />

      <TopicsDrawer
        subject={topicsFor}
        open={topicsFor !== null}
        onOpenChange={(open) => {
          if (!open) setTopicsFor(null);
        }}
      />
    </div>
  );
}
