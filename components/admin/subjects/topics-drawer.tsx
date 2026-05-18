"use client";

import { useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Archive, Check, Pencil, Plus, X } from "lucide-react";
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
import { formatNumber } from "@/lib/utils";
import type { Subject, Topic } from "@/types/api";

interface Props {
  subject: Subject | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Right-side drawer that lists every topic under a subject with
 * inline add/edit/archive controls. No nested route — keeps the
 * admin's mental model "subjects + topics live together" while
 * avoiding a separate URL the user has to navigate back from.
 *
 * Topic edits hit:
 *   POST   /subjects/:id/topics              (create)
 *   PATCH  /subjects/topics/:topicId         (update title/desc/sortOrder)
 *   DELETE /subjects/topics/:topicId         (soft-delete)
 */
export function TopicsDrawer({ subject, open, onOpenChange }: Props) {
  const qc = useQueryClient();

  const { data: topics, isLoading } = useQuery({
    queryKey: QK.SUBJECT_TOPICS(subject?.id ?? "—"),
    queryFn: () =>
      unwrap<Array<Topic & { questionCount: number }>>(
        api.get(`/subjects/${subject!.id}/topics`),
      ),
    enabled: open && subject !== null,
  });

  const [draftTitle, setDraftTitle] = useState("");
  const [draftDesc, setDraftDesc] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const reset = () => {
    setDraftTitle("");
    setDraftDesc("");
    setEditingId(null);
  };

  const create = useMutation({
    mutationFn: () =>
      unwrap<Topic>(
        api.post(`/subjects/${subject!.id}/topics`, {
          title: draftTitle.trim(),
          description: draftDesc.trim() || undefined,
        }),
      ),
    onSuccess: () => {
      toast.success("Topic added.");
      reset();
      qc.invalidateQueries({
        queryKey: QK.SUBJECT_TOPICS(subject!.id),
      });
      // Subject list shows topicCount — refresh that too.
      qc.invalidateQueries({ queryKey: ["subjects"] });
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Failed to add topic"),
  });

  const update = useMutation({
    mutationFn: (topicId: string) =>
      unwrap<Topic>(
        api.patch(`/subjects/topics/${topicId}`, {
          title: editTitle.trim(),
          description: editDesc.trim() || null,
        }),
      ),
    onSuccess: () => {
      toast.success("Topic updated.");
      setEditingId(null);
      qc.invalidateQueries({
        queryKey: QK.SUBJECT_TOPICS(subject!.id),
      });
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Update failed"),
  });

  const remove = useMutation({
    mutationFn: (t: Topic) =>
      api.delete(`/subjects/topics/${t.id}`).then(() => t),
    onSuccess: (t) => {
      toast.success(`"${t.title}" archived.`);
      qc.invalidateQueries({
        queryKey: QK.SUBJECT_TOPICS(subject!.id),
      });
      qc.invalidateQueries({ queryKey: ["subjects"] });
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Archive failed"),
  });

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{subject?.name ?? "Topics"}</SheetTitle>
          <SheetDescription>
            Topics partition a subject further. Each question can be tagged
            with one topic — leave empty for &ldquo;general / no
            topic&rdquo;.
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          {/* Add new topic */}
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 mb-4">
            <div className="text-xs font-medium text-slate-700 mb-2">
              Add topic
            </div>
            <Input
              placeholder="Title (e.g. Quadratic equations)"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              className="mb-2"
            />
            <Textarea
              placeholder="Description (optional)"
              value={draftDesc}
              onChange={(e) => setDraftDesc(e.target.value)}
              rows={2}
              className="mb-2"
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                disabled={!draftTitle.trim() || create.isPending}
                loading={create.isPending}
                onClick={() => create.mutate()}
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>
          </div>

          {/* Topic list */}
          {isLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (topics?.length ?? 0) === 0 ? (
            <div className="rounded-md border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              No topics yet. Add one above.
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {(topics ?? []).map((t) => (
                <li
                  key={t.id}
                  className="rounded-md border border-slate-200 p-3"
                >
                  {editingId === t.id ? (
                    <div className="flex flex-col gap-2">
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                      />
                      <Textarea
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        rows={2}
                      />
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                          disabled={update.isPending}
                        >
                          <X className="h-3.5 w-3.5" /> Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => update.mutate(t.id)}
                          disabled={!editTitle.trim() || update.isPending}
                          loading={update.isPending}
                        >
                          <Check className="h-3.5 w-3.5" /> Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900 text-sm">
                          {t.title}
                        </div>
                        {t.description && (
                          <div className="mt-0.5 text-xs text-slate-500 truncate">
                            {t.description}
                          </div>
                        )}
                        <div className="mt-1 text-[11px] text-slate-400">
                          {formatNumber(t.questionCount ?? 0)} question
                          {t.questionCount === 1 ? "" : "s"}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingId(t.id);
                            setEditTitle(t.title);
                            setEditDesc(t.description ?? "");
                          }}
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
                              `Archive "${t.title}"?\n\nQuestions tagged with this topic still resolve in history.`,
                            );
                            if (ok) remove.mutate(t);
                          }}
                          title="Archive"
                        >
                          <Archive className="h-3.5 w-3.5 text-rose-600" />
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
