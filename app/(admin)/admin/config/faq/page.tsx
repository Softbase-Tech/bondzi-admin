"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { HelpCircle, Plus, RotateCcw, Trash2 } from "lucide-react";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { PageHeader } from "@/components/admin/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FaqEntry } from "@/types/api";

/**
 * FAQ knowledge base admin. Backs the "Common questions" surface on
 * the mobile Help hub. Each row is one Q&A pair — the mobile fetches
 * /faq on Help open, and each tap routes to /help/faq/:slug.
 *
 * Retire vs delete: this UI never hard-deletes. Toggling active or
 * calling DELETE both soft-retire the row — a live share link
 * (WhatsApp, email) still resolves to a "retired" surface on mobile
 * so a moved answer doesn't 404 anyone.
 */

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

interface FaqDraft {
  id?: string;
  slug: string;
  question: string;
  answerMarkdown: string;
  sortOrder: number;
  isActive: boolean;
}

const EMPTY_DRAFT: FaqDraft = {
  slug: "",
  question: "",
  answerMarkdown: "",
  sortOrder: 100,
  isActive: true,
};

function toDraft(a: FaqEntry): FaqDraft {
  return {
    id: a.id,
    slug: a.slug,
    question: a.question,
    answerMarkdown: a.answerMarkdown,
    sortOrder: a.sortOrder,
    isActive: a.isActive,
  };
}

function toPayload(d: FaqDraft) {
  return {
    slug: d.slug.trim(),
    question: d.question.trim(),
    answerMarkdown: d.answerMarkdown.trim(),
    sortOrder: d.sortOrder,
    isActive: d.isActive,
  };
}

export default function FaqAdminPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: QK.FAQ(),
    queryFn: () => unwrap<FaqEntry[]>(api.get("/admin/faq")),
  });

  const [editing, setEditing] = useState<FaqDraft | null>(null);

  const active = useMemo(
    () => (data ?? []).filter((a) => a.isActive),
    [data],
  );
  const retired = useMemo(
    () => (data ?? []).filter((a) => !a.isActive),
    [data],
  );

  const createMut = useMutation({
    mutationFn: (d: FaqDraft) =>
      unwrap<FaqEntry>(api.post("/admin/faq", toPayload(d))),
    onSuccess: () => {
      toast.success("FAQ entry created");
      setEditing(null);
      qc.invalidateQueries({ queryKey: QK.FAQ() });
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Create failed"),
  });

  const updateMut = useMutation({
    mutationFn: (d: FaqDraft) =>
      unwrap<FaqEntry>(api.patch(`/admin/faq/${d.id}`, toPayload(d))),
    onSuccess: () => {
      toast.success("FAQ entry saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: QK.FAQ() });
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Save failed"),
  });

  const retireMut = useMutation({
    mutationFn: (id: string) =>
      unwrap<FaqEntry>(api.delete(`/admin/faq/${id}`)),
    onSuccess: () => {
      toast.success("FAQ entry retired");
      qc.invalidateQueries({ queryKey: QK.FAQ() });
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Retire failed"),
  });

  const restoreMut = useMutation({
    mutationFn: (a: FaqEntry) =>
      unwrap<FaqEntry>(api.patch(`/admin/faq/${a.id}`, { isActive: true })),
    onSuccess: () => {
      toast.success("FAQ entry restored");
      qc.invalidateQueries({ queryKey: QK.FAQ() });
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Restore failed"),
  });

  const submit = () => {
    if (!editing) return;
    if (editing.id) updateMut.mutate(editing);
    else createMut.mutate(editing);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="FAQ"
        description="Common questions on the mobile Help hub. Answers ship as markdown; each tap on mobile routes to /help/faq/:slug. Retire rather than delete — a live share link degrades to a 'retired' surface instead of 404ing."
        actions={
          <Button onClick={() => setEditing({ ...EMPTY_DRAFT })}>
            <Plus className="mr-1 h-4 w-4" /> New FAQ entry
          </Button>
        }
      />

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <HelpCircle className="h-4 w-4" /> Published ({active.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {active.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No published FAQ entries. Add one to populate the mobile
                  Help hub.
                </p>
              ) : (
                active.map((a) => (
                  <FaqRow
                    key={a.id}
                    a={a}
                    onEdit={() => setEditing(toDraft(a))}
                    onRetire={() => {
                      if (confirm(`Retire "${a.question}"?`)) {
                        retireMut.mutate(a.id);
                      }
                    }}
                  />
                ))
              )}
            </CardContent>
          </Card>

          {retired.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-slate-500">
                  <RotateCcw className="h-4 w-4" /> Retired ({retired.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {retired.map((a) => (
                  <FaqRow
                    key={a.id}
                    a={a}
                    onEdit={() => setEditing(toDraft(a))}
                    onRetire={() => restoreMut.mutate(a)}
                    retired
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {editing && (
        <EditorDialog
          value={editing}
          onChange={setEditing}
          onCancel={() => setEditing(null)}
          onSubmit={submit}
          saving={createMut.isPending || updateMut.isPending}
        />
      )}
    </div>
  );
}

function FaqRow({
  a,
  onEdit,
  onRetire,
  retired,
}: {
  a: FaqEntry;
  onEdit: () => void;
  onRetire: () => void;
  retired?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-4 rounded-lg border p-3 ${
        retired ? "opacity-60" : ""
      }`}
    >
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-slate-900">{a.question}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-mono text-[10px]">
            {a.slug}
          </Badge>
          <p className="text-xs text-slate-500">
            sort {a.sortOrder} · updated{" "}
            {new Date(a.updatedAt).toLocaleDateString()}
          </p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onEdit}>
        Edit
      </Button>
      <Button
        variant={retired ? "default" : "ghost"}
        size="sm"
        onClick={onRetire}
      >
        {retired ? (
          <>
            <RotateCcw className="mr-1 h-4 w-4" /> Restore
          </>
        ) : (
          <>
            <Trash2 className="mr-1 h-4 w-4" /> Retire
          </>
        )}
      </Button>
    </div>
  );
}

function EditorDialog({
  value,
  onChange,
  onCancel,
  onSubmit,
  saving,
}: {
  value: FaqDraft;
  onChange: (v: FaqDraft) => void;
  onCancel: () => void;
  onSubmit: () => void;
  saving: boolean;
}) {
  const up = <K extends keyof FaqDraft>(key: K, val: FaqDraft[K]) =>
    onChange({ ...value, [key]: val });

  const slugValid = value.slug === "" || SLUG_PATTERN.test(value.slug);
  const questionValid = value.question.trim().length >= 3;
  const answerValid = value.answerMarkdown.trim().length >= 10;
  const submitDisabled =
    saving ||
    !value.slug ||
    !slugValid ||
    !questionValid ||
    !answerValid;

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {value.id ? "Edit FAQ entry" : "New FAQ entry"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Slug</Label>
            <Input
              placeholder="how-do-i-earn-and-spend-xp"
              value={value.slug}
              onChange={(e) => up("slug", e.target.value)}
            />
            <p
              className={`text-[11px] ${
                slugValid ? "text-slate-500" : "text-red-600"
              }`}
            >
              {slugValid
                ? value.id
                  ? "Renaming an existing slug breaks any share link in the wild."
                  : "Kebab-case: lowercase letters, digits, hyphens."
                : "Slug must be kebab-case (lowercase letters, digits, hyphens)."}
            </p>
          </div>
          <div className="space-y-1">
            <Label>Sort order</Label>
            <Input
              type="number"
              min={0}
              value={value.sortOrder}
              onChange={(e) => up("sortOrder", Number(e.target.value) || 0)}
            />
            <p className="text-[11px] text-slate-500">
              Lower renders higher on the list. Non-unique — ties fall back
              to creation time.
            </p>
          </div>
        </div>

        <div className="space-y-1">
          <Label>Question</Label>
          <Input
            placeholder="How do I earn and spend XP?"
            value={value.question}
            onChange={(e) => up("question", e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label>Answer (markdown)</Label>
          <Textarea
            rows={14}
            placeholder={"You earn XP for every correct answer:\n\n- 10 XP per past-paper question you get right\n- 15 XP per quiz question you get right\n\nSpend XP from Profile → Redeem."}
            value={value.answerMarkdown}
            onChange={(e) => up("answerMarkdown", e.target.value)}
          />
          <p className="text-[11px] text-slate-500">
            Supports paragraphs, bullet lists, bold/italic and links. Rendered
            by MathMarkdown on mobile — LaTeX will render too if you need it.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Switch
            checked={value.isActive}
            onCheckedChange={(v) => up("isActive", v)}
            id="isActive"
          />
          <Label htmlFor="isActive">Published (visible to students)</Label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={submitDisabled}>
            {saving ? "Saving…" : value.id ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
