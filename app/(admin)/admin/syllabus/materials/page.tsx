"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Pencil } from "lucide-react";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { useDebounce } from "@/hooks/use-debounce";
import { usePagination } from "@/hooks/use-pagination";
import { truncate, formatNumber } from "@/lib/utils";
import { PageHeader } from "@/components/admin/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { TablePager } from "@/components/admin/shared/table-pager";
import type {
  LearningMaterialChunk,
  LearningMaterialChunkType,
  LearningMaterialCoverage,
  Subject,
} from "@/types/api";

/**
 * /admin/syllabus/materials — spot-check the AI Knowledge Layer's extracted
 * textbook chunks for OCR artefacts. Filter by subject / form / chunk type,
 * open a chunk to fix its markdown (the server re-embeds automatically on
 * save), or delete junk chunks outright.
 */
const ALL = "__all__";

const CHUNK_TYPES: LearningMaterialChunkType[] = [
  "key_ideas",
  "introduction",
  "example",
  "activity",
  "content",
];

const CHUNK_TYPE_LABELS: Record<LearningMaterialChunkType, string> = {
  key_ideas: "Key ideas",
  introduction: "Introduction",
  example: "Example",
  activity: "Activity",
  content: "Content",
};

/** Distinct badge colour per chunk type so a mixed page scans quickly. */
const CHUNK_TYPE_STYLES: Record<LearningMaterialChunkType, string> = {
  key_ideas: "border-violet-200 bg-violet-50 text-violet-700",
  introduction: "border-sky-200 bg-sky-50 text-sky-700",
  example: "border-emerald-200 bg-emerald-50 text-emerald-700",
  activity: "border-amber-200 bg-amber-50 text-amber-800",
  content: "border-slate-200 bg-slate-100 text-slate-700",
};

function ChunkTypeBadge({ type }: { type: LearningMaterialChunkType }) {
  return (
    <Badge className={CHUNK_TYPE_STYLES[type] ?? CHUNK_TYPE_STYLES.content}>
      {CHUNK_TYPE_LABELS[type] ?? type}
    </Badge>
  );
}

export default function LearningMaterialsPage() {
  const qc = useQueryClient();
  const { page, limit, setPage } = usePagination(50);

  const [subjectId, setSubjectIdRaw] = useState<string>(ALL);
  const [formLevel, setFormLevelRaw] = useState<string>(ALL);
  const [chunkType, setChunkTypeRaw] = useState<string>(ALL);
  const [search, setSearchRaw] = useState("");
  const [editing, setEditing] = useState<LearningMaterialChunk | null>(null);

  const q = useDebounce(search.trim(), 300);

  // Any filter change resets to page 1 — otherwise narrowing a 40-page
  // result set can leave the reviewer stranded on an empty page.
  const setSubjectId = (v: string) => {
    setSubjectIdRaw(v);
    setPage(1);
  };
  const setFormLevel = (v: string) => {
    setFormLevelRaw(v);
    setPage(1);
  };
  const setChunkType = (v: string) => {
    setChunkTypeRaw(v);
    setPage(1);
  };
  const setSearch = (v: string) => {
    setSearchRaw(v);
    setPage(1);
  };

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
      subjectId: subjectId === ALL ? undefined : subjectId,
      formLevel: formLevel === ALL ? undefined : Number(formLevel),
      chunkType: chunkType === ALL ? undefined : chunkType,
      q: q || undefined,
      page,
      limit,
    }),
    [subjectId, formLevel, chunkType, q, page, limit],
  );

  const list = useQuery({
    queryKey: QK.LEARNING_MATERIALS(filters),
    queryFn: () =>
      unwrap<{ items: LearningMaterialChunk[]; total: number }>(
        api.get("/admin/syllabus/learning-materials", { params: filters }),
      ),
  });

  const coverage = useQuery({
    queryKey: QK.LEARNING_MATERIALS_COVERAGE(subjectId),
    queryFn: () =>
      unwrap<LearningMaterialCoverage>(
        api.get(`/admin/syllabus/learning-materials/coverage/${subjectId}`),
      ),
    enabled: subjectId !== ALL,
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["learning-materials"] });

  const patch = useMutation({
    mutationFn: (args: { id: string; bodyMd: string }) =>
      unwrap<LearningMaterialChunk>(
        api.patch(`/admin/syllabus/learning-materials/${args.id}`, {
          bodyMd: args.bodyMd,
        }),
      ),
    onSuccess: () => {
      invalidate();
      setEditing(null);
      toast.success("Saved — re-embedding queued");
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Save failed"),
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      unwrap<{ ok: boolean }>(
        api.delete(`/admin/syllabus/learning-materials/${id}`),
      ),
    onSuccess: () => {
      invalidate();
      setEditing(null);
      toast.success("Chunk deleted");
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Delete failed"),
  });

  const items = list.data?.items ?? [];
  const total = list.data?.total ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Learning materials"
        description="Extracted textbook chunks powering the AI Knowledge Layer. Spot-check OCR quality, fix artefacts, and delete junk — edits re-embed automatically."
      />

      {subjectId !== ALL && (
        <CoverageCard
          subject={subjectName.get(subjectId)}
          coverage={coverage.data}
          isLoading={coverage.isLoading}
          isError={coverage.isError}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Chunks {total !== null && total > 0 ? `(${formatNumber(total)})` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
            <Select value={subjectId} onValueChange={setSubjectId}>
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
            <Select value={formLevel} onValueChange={setFormLevel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All forms</SelectItem>
                <SelectItem value="1">Form 1</SelectItem>
                <SelectItem value="2">Form 2</SelectItem>
                <SelectItem value="3">Form 3</SelectItem>
              </SelectContent>
            </Select>
            <Select value={chunkType} onValueChange={setChunkType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All chunk types</SelectItem>
                {CHUNK_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {CHUNK_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Search body text…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Section</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Page</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead>Embedded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : list.isError ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-10 text-center text-sm text-rose-700"
                    >
                      Failed to load learning materials.{" "}
                      <button
                        type="button"
                        className="underline"
                        onClick={() => list.refetch()}
                      >
                        Retry
                      </button>
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-10 text-center text-sm text-slate-500"
                    >
                      No chunks match these filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer"
                      onClick={() => setEditing(row)}
                    >
                      <TableCell className="font-mono text-xs whitespace-nowrap">
                        {row.sectionCode}
                      </TableCell>
                      <TableCell className="max-w-[220px] text-xs text-slate-700">
                        {row.sectionTitle}
                      </TableCell>
                      <TableCell>
                        <ChunkTypeBadge type={row.chunkType} />
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {row.sourcePage}
                      </TableCell>
                      <TableCell className="max-w-[360px] text-xs text-slate-600">
                        {truncate(row.bodyMd, 120)}
                      </TableCell>
                      <TableCell>
                        {row.embeddedAt ? (
                          <Badge variant="success">embedded</Badge>
                        ) : (
                          <Badge variant="outline">pending</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditing(row);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <TablePager
            page={page}
            limit={limit}
            itemCount={items.length}
            total={total}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>

      <EditDialog
        key={editing?.id ?? "none"}
        chunk={editing}
        subjectName={editing ? subjectName.get(editing.subjectId) : undefined}
        onClose={() => setEditing(null)}
        onSave={(bodyMd) => editing && patch.mutate({ id: editing.id, bodyMd })}
        onDelete={() => {
          if (!editing) return;
          if (
            window.confirm(
              `Delete chunk ${editing.sectionCode} (${CHUNK_TYPE_LABELS[editing.chunkType]})? This removes it from the knowledge layer permanently.`,
            )
          ) {
            remove.mutate(editing.id);
          }
        }}
        saving={patch.isPending}
        deleting={remove.isPending}
      />
    </div>
  );
}

function CoverageCard({
  subject,
  coverage,
  isLoading,
  isError,
}: {
  subject?: string;
  coverage?: LearningMaterialCoverage;
  isLoading: boolean;
  isError: boolean;
}) {
  const pct = (n: number, d: number) =>
    d > 0 ? `${Math.round((n / d) * 100)}%` : "—";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Coverage{subject ? ` — ${subject}` : ""}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : isError ? (
          <p className="text-sm text-rose-700">Failed to load coverage.</p>
        ) : coverage ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Total chunks
                </div>
                <div className="mt-1 text-2xl font-semibold">
                  {formatNumber(coverage.total)}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Embedded
                </div>
                <div className="mt-1 text-2xl font-semibold">
                  {pct(coverage.embedded, coverage.total)}
                  <span className="ml-2 text-sm font-normal text-slate-500">
                    {formatNumber(coverage.embedded)} of{" "}
                    {formatNumber(coverage.total)}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Topic-linked
                </div>
                <div className="mt-1 text-2xl font-semibold">
                  {pct(coverage.topicLinked, coverage.total)}
                  <span className="ml-2 text-sm font-normal text-slate-500">
                    {formatNumber(coverage.topicLinked)} of{" "}
                    {formatNumber(coverage.total)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {Object.entries(coverage.byType).map(([type, count]) => (
                <span key={type} className="inline-flex items-center gap-1">
                  <ChunkTypeBadge
                    type={type as LearningMaterialChunkType}
                  />
                  <span className="text-xs text-slate-600">
                    {formatNumber(count)}
                  </span>
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function EditDialog({
  chunk,
  subjectName,
  onClose,
  onSave,
  onDelete,
  saving,
  deleting,
}: {
  chunk: LearningMaterialChunk | null;
  subjectName?: string;
  onClose: () => void;
  onSave: (bodyMd: string) => void;
  onDelete: () => void;
  saving: boolean;
  deleting: boolean;
}) {
  // Initialised once from `chunk`; the parent passes `key={chunk.id}` so a
  // new chunk remounts this dialog with fresh state (avoids setState-in-effect).
  const [bodyMd, setBodyMd] = useState(chunk?.bodyMd ?? "");

  return (
    <Dialog open={chunk !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {chunk?.sectionCode} · {chunk?.sectionTitle}
            {subjectName ? ` · ${subjectName}` : ""}
          </DialogTitle>
        </DialogHeader>
        {chunk && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <ChunkTypeBadge type={chunk.chunkType} />
              <span>Form {chunk.formLevel}</span>
              <span>
                {chunk.sourcePdf} · p.{chunk.sourcePage}
              </span>
              {chunk.embeddedAt ? (
                <Badge variant="success">embedded</Badge>
              ) : (
                <Badge variant="outline">not embedded</Badge>
              )}
            </div>
            <label className="text-xs font-medium text-slate-600">
              Body (Markdown) — saving queues a re-embed
            </label>
            <Textarea
              rows={16}
              className="font-mono text-xs"
              value={bodyMd}
              onChange={(e) => setBodyMd(e.target.value)}
            />
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="destructive"
                loading={deleting}
                onClick={onDelete}
              >
                Delete
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  loading={saving}
                  disabled={bodyMd.trim().length === 0}
                  onClick={() => onSave(bodyMd)}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
