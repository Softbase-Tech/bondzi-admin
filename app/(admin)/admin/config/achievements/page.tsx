"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Medal, Plus, RotateCcw, Trash2 } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Achievement, AchievementMetricKey } from "@/types/api";

/**
 * Achievements catalogue admin. Backs the Milestones strip on the
 * mobile Profile screen. Each row is the definition; per-user unlock
 * rows live on `user_achievements` and are managed by the backend
 * service (nothing to touch here).
 *
 * Retire vs delete: this UI never hard-deletes. Toggling active or
 * calling DELETE both soft-retire the row — the backend keeps the
 * definition around so historical `user_achievements.unlocked_at`
 * rows resolve.
 */

const METRIC_LABEL: Record<AchievementMetricKey, string> = {
  answers_count: "Answers count",
  streak_max: "Max streak (current or longest)",
  longest_streak: "Longest streak",
  accuracy_pct: "Accuracy %",
  level: "Level",
};

const METRIC_HINT: Record<AchievementMetricKey, string> = {
  answers_count: "Cumulative questions answered across every subject.",
  streak_max:
    "Highest of current and longest streak — matches the client's old 5-day-streak unlock.",
  longest_streak:
    "Longest streak ever — steadier than streak_max for milestones the student should feel they earned.",
  accuracy_pct:
    "Rolling accuracy as an integer %. Use with min-answers to prevent 100% off two lucky guesses.",
  level: "Gamification level from the XP curve.",
};

const ICON_KEYS = ["check", "flame", "sparkle", "star", "trophy", "lightning"];

interface AchievementDraft {
  id?: string;
  key: string;
  title: string;
  description: string;
  metricKey: AchievementMetricKey;
  thresholdValue: number;
  minAnswers: string; // string so the input can hold "" for null
  iconKey: string;
  gradientStart: string;
  gradientEnd: string;
  sortOrder: number;
  isActive: boolean;
}

const EMPTY_DRAFT: AchievementDraft = {
  key: "",
  title: "",
  description: "",
  metricKey: "answers_count",
  thresholdValue: 10,
  minAnswers: "",
  iconKey: "check",
  gradientStart: "#06D6A0",
  gradientEnd: "#0AA47C",
  sortOrder: 100,
  isActive: true,
};

function toDraft(a: Achievement): AchievementDraft {
  return {
    id: a.id,
    key: a.key,
    title: a.title,
    description: a.description ?? "",
    metricKey: a.metricKey,
    thresholdValue: a.thresholdValue,
    minAnswers: a.minAnswers == null ? "" : String(a.minAnswers),
    iconKey: a.iconKey,
    gradientStart: a.gradientStart,
    gradientEnd: a.gradientEnd,
    sortOrder: a.sortOrder,
    isActive: a.isActive,
  };
}

function toPayload(d: AchievementDraft) {
  return {
    key: d.key.trim(),
    title: d.title.trim(),
    description: d.description.trim() || undefined,
    metricKey: d.metricKey,
    thresholdValue: d.thresholdValue,
    minAnswers: d.minAnswers.trim() === "" ? null : Number(d.minAnswers),
    iconKey: d.iconKey,
    gradientStart: d.gradientStart,
    gradientEnd: d.gradientEnd,
    sortOrder: d.sortOrder,
    isActive: d.isActive,
  };
}

export default function AchievementsAdminPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: QK.ACHIEVEMENTS(),
    queryFn: () => unwrap<Achievement[]>(api.get("/admin/achievements")),
  });

  const [editing, setEditing] = useState<AchievementDraft | null>(null);

  const active = useMemo(
    () => (data ?? []).filter((a) => a.isActive),
    [data],
  );
  const retired = useMemo(
    () => (data ?? []).filter((a) => !a.isActive),
    [data],
  );

  const createMut = useMutation({
    mutationFn: (d: AchievementDraft) =>
      unwrap<Achievement>(api.post("/admin/achievements", toPayload(d))),
    onSuccess: () => {
      toast.success("Achievement created");
      setEditing(null);
      qc.invalidateQueries({ queryKey: QK.ACHIEVEMENTS() });
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Create failed"),
  });

  const updateMut = useMutation({
    mutationFn: (d: AchievementDraft) =>
      unwrap<Achievement>(
        api.patch(`/admin/achievements/${d.id}`, toPayload(d)),
      ),
    onSuccess: () => {
      toast.success("Achievement saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: QK.ACHIEVEMENTS() });
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Save failed"),
  });

  const retireMut = useMutation({
    mutationFn: (id: string) =>
      unwrap<Achievement>(api.delete(`/admin/achievements/${id}`)),
    onSuccess: () => {
      toast.success("Achievement retired");
      qc.invalidateQueries({ queryKey: QK.ACHIEVEMENTS() });
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Retire failed"),
  });

  const restoreMut = useMutation({
    mutationFn: (a: Achievement) =>
      unwrap<Achievement>(
        api.patch(`/admin/achievements/${a.id}`, { isActive: true }),
      ),
    onSuccess: () => {
      toast.success("Achievement restored");
      qc.invalidateQueries({ queryKey: QK.ACHIEVEMENTS() });
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
        title="Achievements"
        description="Milestones that appear on the mobile Profile strip. Each row is a definition; per-user unlock timestamps live on the users side and don't need touching here."
        actions={
          <Button onClick={() => setEditing({ ...EMPTY_DRAFT })}>
            <Plus className="mr-1 h-4 w-4" /> New achievement
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
                <Medal className="h-4 w-4" /> Active ({active.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {active.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No active achievements. Add one to populate the mobile
                  strip.
                </p>
              ) : (
                active.map((a) => (
                  <AchievementRow
                    key={a.id}
                    a={a}
                    onEdit={() => setEditing(toDraft(a))}
                    onRetire={() => {
                      if (confirm(`Retire "${a.title}"?`)) {
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
                  <AchievementRow
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

function AchievementRow({
  a,
  onEdit,
  onRetire,
  retired,
}: {
  a: Achievement;
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
      <div
        className="flex h-12 w-12 items-center justify-center rounded-lg text-white shadow-sm"
        style={{
          backgroundImage: `linear-gradient(135deg, ${a.gradientStart}, ${a.gradientEnd})`,
        }}
      >
        <Medal className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-slate-900">{a.title}</p>
          <Badge variant="outline" className="font-mono text-[10px]">
            {a.key}
          </Badge>
        </div>
        <p className="text-xs text-slate-500">
          {METRIC_LABEL[a.metricKey]} ≥ {a.thresholdValue}
          {a.minAnswers != null && ` · min ${a.minAnswers} answers`}
          {" · "}sort {a.sortOrder}
        </p>
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
  value: AchievementDraft;
  onChange: (v: AchievementDraft) => void;
  onCancel: () => void;
  onSubmit: () => void;
  saving: boolean;
}) {
  const up = <K extends keyof AchievementDraft>(
    key: K,
    val: AchievementDraft[K],
  ) => onChange({ ...value, [key]: val });

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {value.id ? "Edit achievement" : "New achievement"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Key</Label>
            <Input
              placeholder="first-100"
              value={value.key}
              disabled={Boolean(value.id)}
              onChange={(e) => up("key", e.target.value)}
            />
            <p className="text-[11px] text-slate-500">
              Kebab-case slug; used by mobile for local overrides. Cannot be
              renamed after creation.
            </p>
          </div>
          <div className="space-y-1">
            <Label>Title</Label>
            <Input
              placeholder="100 answers"
              value={value.title}
              onChange={(e) => up("title", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label>Description</Label>
          <Textarea
            rows={2}
            placeholder="Optional caption for future tap-to-detail sheets."
            value={value.description}
            onChange={(e) => up("description", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <Label>Metric</Label>
            <Select
              value={value.metricKey}
              onValueChange={(v) => up("metricKey", v as AchievementMetricKey)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(METRIC_LABEL) as AchievementMetricKey[]).map(
                  (k) => (
                    <SelectItem key={k} value={k}>
                      {METRIC_LABEL[k]}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-slate-500">
              {METRIC_HINT[value.metricKey]}
            </p>
          </div>
          <div className="space-y-1">
            <Label>Threshold</Label>
            <Input
              type="number"
              min={1}
              value={value.thresholdValue}
              onChange={(e) =>
                up("thresholdValue", Number(e.target.value) || 1)
              }
            />
          </div>
          <div className="space-y-1">
            <Label>Min answers (optional)</Label>
            <Input
              type="number"
              min={0}
              placeholder="20"
              value={value.minAnswers}
              onChange={(e) => up("minAnswers", e.target.value)}
            />
            <p className="text-[11px] text-slate-500">
              Only meaningful for accuracy metrics.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <Label>Icon</Label>
            <Select
              value={value.iconKey}
              onValueChange={(v) => up("iconKey", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ICON_KEYS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Gradient start (hex)</Label>
            <Input
              placeholder="#06D6A0"
              value={value.gradientStart}
              onChange={(e) => up("gradientStart", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Gradient end (hex)</Label>
            <Input
              placeholder="#0AA47C"
              value={value.gradientEnd}
              onChange={(e) => up("gradientEnd", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Sort order</Label>
            <Input
              type="number"
              min={0}
              value={value.sortOrder}
              onChange={(e) => up("sortOrder", Number(e.target.value) || 0)}
            />
            <p className="text-[11px] text-slate-500">
              Lower renders further left. Non-unique — ties fall back to
              creation time.
            </p>
          </div>
          <div className="flex items-center gap-3 pt-6">
            <Switch
              checked={value.isActive}
              onCheckedChange={(v) => up("isActive", v)}
              id="isActive"
            />
            <Label htmlFor="isActive">Active</Label>
          </div>
        </div>

        {/* Live preview */}
        <div
          className="mt-2 flex h-24 w-40 flex-col justify-between rounded-2xl p-3 text-white shadow-sm"
          style={{
            backgroundImage: `linear-gradient(135deg, ${value.gradientStart}, ${value.gradientEnd})`,
          }}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 text-white">
            <Medal className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">
              {value.title || "Title"}
            </p>
            <p className="text-[10px] opacity-85">
              {value.isActive ? "Preview" : "Retired"}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={saving}>
            {saving ? "Saving…" : value.id ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
