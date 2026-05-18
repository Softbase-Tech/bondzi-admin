"use client";

import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { api, unwrap } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ExamType, Subject } from "@/types/api";

type Category = "core" | "elective" | "vocational";

interface FormValues {
  code: string;
  name: string;
  examType: ExamType;
  category: Category;
  isCore: boolean;
  sortOrder: string;
}

interface Props {
  mode: "create" | "edit";
  subject: Subject | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULTS: FormValues = {
  code: "",
  name: "",
  examType: "wassce",
  category: "core",
  isCore: false,
  sortOrder: "0",
};

/**
 * Single modal used for both Create and Edit. On edit, `code`,
 * `examType`, and `isCore` are read-only — those values partition
 * downstream data (every question carries `subjectId` AND an
 * inherited examType) and changing them retroactively would
 * mis-categorise existing questions. Want a different code? Archive
 * this subject and create a new one.
 */
export function SubjectFormModal({
  mode,
  subject,
  open,
  onOpenChange,
}: Props) {
  const qc = useQueryClient();

  const form = useForm<FormValues>({ defaultValues: DEFAULTS });

  // Reset the form whenever the modal opens for a different row.
  // Without this, switching between "Edit subject A" and "Create"
  // would carry A's values into the empty create form.
  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && subject) {
      form.reset({
        code: subject.code,
        name: subject.name,
        examType: subject.examType,
        category: subject.category,
        isCore: subject.isCore,
        sortOrder: String(subject.sortOrder ?? 0),
      });
    } else {
      form.reset(DEFAULTS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, subject?.id]);

  const create = useMutation({
    mutationFn: (v: FormValues) =>
      unwrap<Subject>(
        api.post("/subjects", {
          code: v.code.trim().toUpperCase(),
          name: v.name.trim(),
          examType: v.examType,
          category: v.category,
          isCore: v.isCore,
          sortOrder: parseSortOrder(v.sortOrder),
        }),
      ),
    onSuccess: (s) => {
      toast.success(`${s.name} created.`);
      qc.invalidateQueries({ queryKey: ["subjects"] });
      onOpenChange(false);
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Create failed"),
  });

  const update = useMutation({
    mutationFn: (v: FormValues) =>
      unwrap<Subject>(
        api.patch(`/subjects/${subject!.id}`, {
          // Only the fields the API actually accepts on PATCH.
          name: v.name.trim(),
          category: v.category,
          sortOrder: parseSortOrder(v.sortOrder),
        }),
      ),
    onSuccess: (s) => {
      toast.success(`${s.name} updated.`);
      qc.invalidateQueries({ queryKey: ["subjects"] });
      onOpenChange(false);
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Update failed"),
  });

  const busy = create.isPending || update.isPending;
  const isEdit = mode === "edit";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Edit ${subject?.name ?? "subject"}` : "New subject"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Code, exam type, and core flag are immutable — they partition the question bank. Rename via the name field; archive + recreate to change a code."
              : "Subjects partition the question bank. Pick a stable UPPER_SNAKE_CASE code that you won't change later."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit((v) =>
            isEdit ? update.mutate(v) : create.mutate(v),
          )}
          className="flex flex-col gap-3"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Display name</Label>
            <Input
              id="name"
              placeholder="Core Mathematics"
              {...form.register("name", { required: true, maxLength: 80 })}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="code">
              Code{" "}
              <span className="text-[10px] text-slate-500">
                (UPPER_SNAKE_CASE)
              </span>
            </Label>
            <Input
              id="code"
              placeholder="WASSCE_CORE_MATHS"
              disabled={isEdit}
              {...form.register("code", {
                required: !isEdit,
                pattern: /^[A-Z0-9_]+$/,
                maxLength: 40,
              })}
              className="font-mono"
            />
            {isEdit && (
              <p className="text-[11px] text-slate-500">
                Immutable. Archive and recreate to change.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Exam type</Label>
              <Select
                value={form.watch("examType")}
                onValueChange={(v) =>
                  form.setValue("examType", v as ExamType, {
                    shouldDirty: true,
                  })
                }
                disabled={isEdit}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bece">BECE</SelectItem>
                  <SelectItem value="wassce">WASSCE</SelectItem>
                </SelectContent>
              </Select>
              {isEdit && (
                <p className="text-[11px] text-slate-500">Immutable.</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Category</Label>
              <Select
                value={form.watch("category")}
                onValueChange={(v) =>
                  form.setValue("category", v as Category, {
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="core">Core</SelectItem>
                  <SelectItem value="elective">Elective</SelectItem>
                  <SelectItem value="vocational">Vocational</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
            <div>
              <Label className="text-sm">Core subject</Label>
              <p className="text-[11px] text-slate-500">
                Required of every student. Surfaces first in the subject
                catalogue.
              </p>
            </div>
            <Switch
              checked={form.watch("isCore")}
              onCheckedChange={(v) =>
                form.setValue("isCore", v, { shouldDirty: true })
              }
              disabled={isEdit}
              aria-label="Mark as core subject"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sortOrder">Sort order</Label>
            <Input
              id="sortOrder"
              type="number"
              min={0}
              {...form.register("sortOrder")}
            />
            <p className="text-[11px] text-slate-500">
              Lower numbers appear first on the student app.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" loading={busy}>
              {isEdit ? "Save changes" : "Create subject"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function parseSortOrder(raw: string): number {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}
