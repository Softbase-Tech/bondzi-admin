"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Pencil, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { QK } from "@/lib/query-keys";
import {
  createBanner,
  deleteBanner,
  listAllBanners,
  updateBanner,
} from "@/lib/partners/api";
import { PageHeader } from "@/components/admin/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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
import type { PartnerBanner, PartnerBannerAspect } from "@/types/api";

/**
 * Banner CRUD. Admin uploads to their CDN of choice (Cloudinary /
 * S3 / etc.) and pastes the URL in. Later phase can add direct-
 * upload via signed URL, but pasting is fine for launch.
 */
export default function PartnersBannersPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: QK.PARTNER_BANNERS_LIST(),
    queryFn: listAllBanners,
  });
  const [editing, setEditing] = useState<PartnerBanner | "new" | null>(null);

  const deleteMut = useMutation({
    mutationFn: (b: PartnerBanner) => deleteBanner(b.id),
    onSuccess: () => {
      toast.success("Banner deleted");
      void qc.invalidateQueries({ queryKey: QK.PARTNER_BANNERS_LIST() });
    },
    onError: (err: { message?: string }) =>
      toast.error(err.message ?? "Failed"),
  });

  const toggleMut = useMutation({
    mutationFn: (b: PartnerBanner) =>
      updateBanner(b.id, { isActive: !b.isActive }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.PARTNER_BANNERS_LIST() });
    },
    onError: (err: { message?: string }) =>
      toast.error(err.message ?? "Failed"),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Banner gallery"
        description="Shareable images partners can download and post."
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus size={14} className="mr-1" />
            New banner
          </Button>
        }
      />

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (data?.length ?? 0) === 0 ? (
        <Card className="p-6 text-sm text-slate-500">
          No banners yet. Add one to unblock partners.
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data!.map((b) => (
            <Card key={b.id} className="overflow-hidden">
              <div
                className={`relative w-full ${aspectClass(b.aspect)} bg-slate-100`}
              >
                <Image
                  src={b.imageUrl}
                  alt={b.label}
                  fill
                  className="object-cover"
                  unoptimized
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {b.label}
                    </p>
                    <p className="text-xs text-slate-500">
                      {b.aspect}
                      {b.widthPx && b.heightPx
                        ? ` · ${b.widthPx}×${b.heightPx}`
                        : ""}{" "}
                      · sort {b.sortOrder}
                    </p>
                  </div>
                  <Switch
                    checked={b.isActive}
                    onCheckedChange={() => toggleMut.mutate(b)}
                    aria-label="Active"
                  />
                </div>
                {b.description ? (
                  <p className="text-xs text-slate-600 line-clamp-3">
                    {b.description}
                  </p>
                ) : null}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditing(b)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-900"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Delete "${b.label}"? This is permanent.`)) {
                        deleteMut.mutate(b);
                      }
                    }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-rose-700 hover:text-rose-900"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <BannerFormDialog
        editing={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          void qc.invalidateQueries({ queryKey: QK.PARTNER_BANNERS_LIST() });
        }}
      />
    </div>
  );
}

function aspectClass(a: PartnerBannerAspect): string {
  switch (a) {
    case "story":
      return "aspect-[9/16]";
    case "landscape":
      return "aspect-[16/9]";
    default:
      return "aspect-square";
  }
}

// -------------------------- Form dialog --------------------------

function BannerFormDialog({
  editing,
  onClose,
  onSaved,
}: {
  editing: PartnerBanner | "new" | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = editing === "new";
  const initial =
    isNew || editing === null
      ? {
          label: "",
          description: "",
          imageUrl: "",
          aspect: "square" as PartnerBannerAspect,
          widthPx: "",
          heightPx: "",
          sortOrder: "100",
          isActive: true,
        }
      : {
          label: editing.label,
          description: editing.description ?? "",
          imageUrl: editing.imageUrl,
          aspect: editing.aspect,
          widthPx: editing.widthPx ? String(editing.widthPx) : "",
          heightPx: editing.heightPx ? String(editing.heightPx) : "",
          sortOrder: String(editing.sortOrder),
          isActive: editing.isActive,
        };
  const [form, setForm] = useState(initial);

  // Reset the local form whenever we pop a different row into the
  // dialog — otherwise switching from "edit A" → "edit B" leaves
  // A's values in the fields.
  const editingKey =
    editing === null ? "closed" : editing === "new" ? "new" : editing.id;
  const [openedFor, setOpenedFor] = useState<string>(editingKey);
  if (openedFor !== editingKey) {
    setOpenedFor(editingKey);
    setForm(initial);
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      const body = {
        label: form.label.trim(),
        description: form.description.trim() || undefined,
        imageUrl: form.imageUrl.trim(),
        aspect: form.aspect,
        widthPx: form.widthPx ? Number(form.widthPx) : undefined,
        heightPx: form.heightPx ? Number(form.heightPx) : undefined,
        sortOrder: Number(form.sortOrder) || 100,
        isActive: form.isActive,
      };
      if (isNew) return createBanner(body);
      return updateBanner((editing as PartnerBanner).id, body);
    },
    onSuccess: () => {
      toast.success(isNew ? "Banner created" : "Banner updated");
      onSaved();
    },
    onError: (err: { message?: string }) =>
      toast.error(err.message ?? "Failed to save"),
  });

  const canSave =
    form.label.trim().length > 1 &&
    /^https:\/\//i.test(form.imageUrl.trim());

  return (
    <Dialog
      open={editing !== null}
      onOpenChange={(v) => (v ? undefined : onClose())}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isNew ? "New banner" : "Edit banner"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Label</Label>
            <Input
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Image URL (https://…)</Label>
            <Input
              value={form.imageUrl}
              onChange={(e) =>
                setForm({ ...form, imageUrl: e.target.value })
              }
              placeholder="https://cdn.example.com/banner.png"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Aspect</Label>
              <Select
                value={form.aspect}
                onValueChange={(v) =>
                  setForm({ ...form, aspect: v as PartnerBannerAspect })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="square">Square (1:1)</SelectItem>
                  <SelectItem value="story">Story (9:16)</SelectItem>
                  <SelectItem value="landscape">Landscape (16:9)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Width (px)</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={form.widthPx}
                onChange={(e) =>
                  setForm({ ...form, widthPx: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Height (px)</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={form.heightPx}
                onChange={(e) =>
                  setForm({ ...form, heightPx: e.target.value })
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 items-end">
            <div className="space-y-2">
              <Label>Sort order</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm({ ...form, sortOrder: e.target.value })
                }
              />
            </div>
            <div className="flex items-center gap-2 justify-end pb-2">
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
              <Label>Active</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => saveMut.mutate()}
            disabled={!canSave || saveMut.isPending}
          >
            {saveMut.isPending ? "Saving…" : isNew ? "Create" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
