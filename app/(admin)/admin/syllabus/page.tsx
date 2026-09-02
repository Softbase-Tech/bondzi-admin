"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { PageHeader } from "@/components/admin/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  Paginated,
  Subject,
  SyllabusIndicatorRow,
} from "@/types/api";

/**
 * /admin/syllabus — review the extracted curriculum. Filter the draft queue by
 * subject, edit a statement / worked content, and approve. Approval makes an
 * indicator eligible for embedding; "Embed approved" pushes those into pgvector.
 */
const PAGE_SIZE = 50;
const ALL = "__all__";

export default function SyllabusReviewPage() {
  const qc = useQueryClient();
  const [subjectId, setSubjectId] = useState<string>(ALL);
  const [status, setStatus] = useState<string>("draft");
  const [embedded, setEmbedded] = useState<string>(ALL);
  const [offset, setOffset] = useState(0);
  const [editing, setEditing] = useState<SyllabusIndicatorRow | null>(null);

  const subjects = useQuery({
    queryKey: QK.SUBJECTS_LIST(),
    queryFn: () => unwrap<Subject[]>(api.get("/subjects")),
  });
  const subjectName = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of subjects.data ?? []) m.set(s.id, s.name);
    return m;
  }, [subjects.data]);

  const filters = useMemo(
    () => ({
      page: Math.floor(offset / PAGE_SIZE) + 1,
      limit: PAGE_SIZE,
      status: status === ALL ? undefined : status,
      subjectId: subjectId === ALL ? undefined : subjectId,
      embedded: embedded === ALL ? undefined : embedded === "true",
    }),
    [offset, status, subjectId, embedded],
  );

  const list = useQuery({
    queryKey: QK.SYLLABUS_INDICATORS(filters),
    queryFn: () =>
      unwrap<Paginated<SyllabusIndicatorRow>>(
        api.get("/admin/syllabus/indicators", { params: filters }),
      ),
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["syllabus"] });

  const patch = useMutation({
    mutationFn: (args: { id: string; body: Record<string, unknown> }) =>
      unwrap(api.patch(`/admin/syllabus/indicators/${args.id}`, args.body)),
    onSuccess: () => {
      invalidate();
      setEditing(null);
    },
    onError: (e: { message?: string }) => toast.error(e.message ?? "Failed"),
  });

  const embed = useMutation({
    mutationFn: () =>
      unwrap<{ started: boolean; alreadyRunning: boolean; pending: number }>(
        api.post("/admin/syllabus/embed", {}),
      ),
    onSuccess: (r) => {
      // Embedding runs in the background now — the request returns immediately.
      if (r.alreadyRunning) {
        toast(`Embedding already running (${r.pending} pending)`);
      } else if (r.started) {
        toast.success(
          `Embedding started for ${r.pending} indicators — refresh to watch progress`,
        );
      } else {
        toast("Nothing to embed — all approved indicators are up to date");
      }
      invalidate();
    },
    onError: (e: { message?: string }) => toast.error(e.message ?? "Embed failed"),
  });

  const approveAll = useMutation({
    // Scoped to the current subject filter — "Approve all" clears the draft
    // queue you're looking at. With "All subjects" selected it approves every
    // draft.
    mutationFn: () =>
      unwrap<{ approved: number }>(
        api.post("/admin/syllabus/approve-all", {
          subjectId: subjectId === ALL ? undefined : subjectId,
        }),
      ),
    onSuccess: (r) => {
      toast.success(`Approved ${r.approved} indicators`);
      invalidate();
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Approve failed"),
  });

  const total = list.data?.total ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Syllabus review"
        description="Extracted NaCCA indicators land as draft. Edit + approve; approved indicators can be embedded for retrieval."
      />

      <Card>
        <CardHeader>
          {/* Title + two action buttons: ~300px of content that cannot fit
              one line on a 320px screen, so the actions wrap beneath. */}
          <CardTitle className="text-base flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>Indicators {total > 0 ? `(${total})` : ""}</span>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                loading={approveAll.isPending}
                onClick={() => {
                  const scope =
                    subjectId === ALL
                      ? "ALL subjects"
                      : (subjectName.get(subjectId) ?? "this subject");
                  if (
                    window.confirm(
                      `Approve all draft indicators for ${scope}? Approved indicators become eligible for embedding.`,
                    )
                  ) {
                    approveAll.mutate();
                  }
                }}
              >
                Approve all
              </Button>
              <Button
                size="sm"
                loading={embed.isPending}
                onClick={() => embed.mutate()}
              >
                Embed approved
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Select
              value={subjectId}
              onValueChange={(v) => {
                setSubjectId(v);
                setOffset(0);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All subjects</SelectItem>
                {(subjects.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                setOffset(0);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value={ALL}>All</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={embedded}
              onValueChange={(v) => {
                setEmbedded(v);
                setOffset(0);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Any embedding</SelectItem>
                <SelectItem value="true">Embedded</SelectItem>
                <SelectItem value="false">Not embedded</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Form</TableHead>
                  <TableHead>Statement</TableHead>
                  <TableHead>DoK</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (list.data?.items ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-6 text-center text-sm text-slate-500">
                      No indicators match these filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  (list.data?.items ?? []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-xs whitespace-nowrap">
                        {row.code}
                      </TableCell>
                      <TableCell>{row.formLevel}</TableCell>
                      <TableCell className="max-w-[420px] text-xs text-slate-700">
                        {row.statement}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {row.targetDokLevels?.join(",") ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={row.status === "approved" ? "success" : "outline"}
                        >
                          {row.status}
                        </Badge>
                        {row.isEmbedded ? (
                          <span className="ml-1 text-[10px] text-emerald-600">●</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button variant="ghost" size="sm" onClick={() => setEditing(row)}>
                          Edit
                        </Button>
                        {row.status === "draft" ? (
                          <Button
                            size="sm"
                            onClick={() =>
                              patch.mutate({ id: row.id, body: { status: "approved" } })
                            }
                          >
                            Approve
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={offset === 0 || list.isLoading}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              ← Previous
            </Button>
            <span className="text-xs text-slate-500">
              {total > 0 ? `${offset + 1}–${Math.min(offset + PAGE_SIZE, total)} of ${total}` : ""}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={list.isLoading || offset + PAGE_SIZE >= total}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              Next →
            </Button>
          </div>
        </CardContent>
      </Card>

      <EditDialog
        key={editing?.id ?? "none"}
        row={editing}
        subjectName={editing ? subjectName.get(editing.subjectId) : undefined}
        onClose={() => setEditing(null)}
        onSave={(body) => editing && patch.mutate({ id: editing.id, body })}
        saving={patch.isPending}
      />
    </div>
  );
}

function EditDialog({
  row,
  subjectName,
  onClose,
  onSave,
  saving,
}: {
  row: SyllabusIndicatorRow | null;
  subjectName?: string;
  onClose: () => void;
  onSave: (body: Record<string, unknown>) => void;
  saving: boolean;
}) {
  // Initialised once from `row`; the parent passes `key={row.id}` so a new
  // row remounts this dialog with fresh state (avoids setState-in-effect).
  const [statement, setStatement] = useState(row?.statement ?? "");
  const [worked, setWorked] = useState(row?.workedContent ?? "");

  return (
    <Dialog open={row !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {row?.code}
            {subjectName ? ` · ${subjectName}` : ""}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <label className="text-xs font-medium text-slate-600">Statement</label>
          <Textarea
            rows={3}
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
          />
          <label className="text-xs font-medium text-slate-600">
            Worked content (optional)
          </label>
          <Textarea
            rows={6}
            value={worked}
            onChange={(e) => setWorked(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              loading={saving}
              onClick={() =>
                onSave({ statement, workedContent: worked || null })
              }
            >
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
