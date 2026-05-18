"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/admin/layout/page-header";
import { StimulusModal } from "@/components/admin/stimuli/stimulus-modal";
import { formatDateTime, truncate } from "@/lib/utils";
import type { QuestionStimulus } from "@/types/api";

export default function StimuliPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<QuestionStimulus | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: QK.STIMULI_LIST({ search: search || undefined }),
    queryFn: () =>
      unwrap<QuestionStimulus[]>(
        api.get("/admin/stimuli", {
          params: search ? { search } : undefined,
        }),
      ),
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      unwrap(api.delete(`/admin/stimuli/${id}`)),
    onSuccess: () => {
      toast.success("Stimulus deleted");
      qc.invalidateQueries({ queryKey: ["stimuli"] });
    },
    onError: (err: { message?: string }) =>
      toast.error(err.message ?? "Delete failed"),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Shared stimuli"
        description="Reusable context blocks (tables, passages, diagrams) referenced by question groups. Past papers commonly attach 2+ questions to one stimulus."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> New stimulus
          </Button>
        }
      />

      <Card className="flex items-center gap-2 p-3">
        <Search className="h-4 w-4 text-slate-400" />
        <Input
          className="h-9 border-0 bg-transparent shadow-none focus-visible:ring-0"
          placeholder="Search by title or body..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Preview</TableHead>
              <TableHead className="w-24 text-right">Used by</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-24 text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : (data ?? []).length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-12 text-center text-slate-500"
                >
                  {search
                    ? `No stimuli match “${search}”.`
                    : "No shared stimuli yet. Create the first one above."}
                </TableCell>
              </TableRow>
            ) : (
              (data ?? []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="max-w-[14rem]">
                    <div className="truncate text-sm font-medium text-slate-900">
                      {s.title ?? (
                        <span className="italic text-slate-400">
                          (untitled)
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[26rem]">
                    <div className="line-clamp-2 text-xs text-slate-600">
                      {truncate(s.body, 220)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline">{s.questionCount ?? 0}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {formatDateTime(s.updatedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        aria-label="Edit"
                        onClick={() => setEditTarget(s)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        aria-label="Delete"
                        disabled={(s.questionCount ?? 0) > 0}
                        title={
                          (s.questionCount ?? 0) > 0
                            ? `Detach the ${s.questionCount} question(s) before deleting.`
                            : undefined
                        }
                        onClick={() => {
                          if (
                            confirm(
                              `Delete stimulus${s.title ? ` "${s.title}"` : ""}? This is permanent.`,
                            )
                          ) {
                            remove.mutate(s.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <StimulusModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        stimulus={null}
      />
      <StimulusModal
        open={editTarget !== null}
        onOpenChange={(o) => !o && setEditTarget(null)}
        stimulus={editTarget}
      />
    </div>
  );
}
