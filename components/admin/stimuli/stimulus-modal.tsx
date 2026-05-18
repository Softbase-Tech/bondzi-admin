"use client";

import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { api, unwrap } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MathEditor } from "@/components/admin/questions/math-editor";
import type { QuestionStimulus } from "@/types/api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Pass an existing stimulus to edit, or null/undefined to create a fresh one.
   * The form resets when the value changes.
   */
  stimulus?: QuestionStimulus | null;
  /** Called with the new/updated stimulus once the mutation succeeds. */
  onSaved?: (stimulus: QuestionStimulus) => void;
}

interface FormValues {
  title: string;
  body: string;
  imageUrl: string;
}

const EMPTY: FormValues = { title: "", body: "", imageUrl: "" };

function fromStimulus(s: QuestionStimulus): FormValues {
  return {
    title: s.title ?? "",
    body: s.body,
    imageUrl: s.imageUrl ?? "",
  };
}

export function StimulusModal({
  open,
  onOpenChange,
  stimulus,
  onSaved,
}: Props) {
  const qc = useQueryClient();
  const isEdit = Boolean(stimulus?.id);

  const form = useForm<FormValues>({ defaultValues: EMPTY });

  useEffect(() => {
    if (!open) return;
    form.reset(stimulus ? fromStimulus(stimulus) : EMPTY);
  }, [open, stimulus, form]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues): Promise<QuestionStimulus> => {
      const payload = {
        title: values.title.trim() || undefined,
        body: values.body.trim(),
        imageUrl: values.imageUrl.trim() || undefined,
      };
      if (isEdit && stimulus) {
        return unwrap<QuestionStimulus>(
          api.patch(`/admin/stimuli/${stimulus.id}`, payload),
        );
      }
      return unwrap<QuestionStimulus>(api.post("/admin/stimuli", payload));
    },
    onSuccess: (saved) => {
      toast.success(isEdit ? "Stimulus updated" : "Stimulus created");
      qc.invalidateQueries({ queryKey: ["stimuli"] });
      onSaved?.(saved);
      onOpenChange(false);
    },
    onError: (err: { message?: string }) =>
      toast.error(err.message ?? "Failed to save stimulus"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/*
        Cap dialog height at 90vh and lay out as a column so the footer
        (Cancel + Save/Create) stays pinned visible while the body fields
        scroll. Without this, a long stimulus body grows the modal past
        the viewport and the action buttons fall off-screen.
      */}
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit shared stimulus" : "New shared stimulus"}
          </DialogTitle>
          <DialogDescription>
            Markdown body — supports tables, lists, and{" "}
            <code>$...$</code> LaTeX math. The same block is shown above every
            question that references it.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          className="flex flex-1 flex-col gap-4 min-h-0"
        >
          {/* min-h-0 lets this flex child actually shrink so the
              `overflow-y-auto` below can take effect — without it, the
              child's intrinsic height wins and there's nothing to scroll. */}
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4 pr-1 -mr-1">
            <div className="space-y-1">
              <Label htmlFor="title">
                Title{" "}
                <span className="text-xs font-normal text-slate-500">
                  (optional, shown in the picker)
                </span>
              </Label>
              <Input
                id="title"
                placeholder="e.g. Temperatures table"
                {...form.register("title")}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="body">
                Body <span className="text-rose-600">*</span>
              </Label>
              <MathEditor
                id="body"
                value={form.watch("body") ?? ""}
                onChange={(v) =>
                  form.setValue("body", v, { shouldValidate: true })
                }
                rows={8}
                placeholder={
                  "The table below shows the day and night temperatures of a town during a week.\n\n| Week day | Day (°C) | Night (°C) |\n|---|---|---|\n| Monday | 33 | 24 |\n| Tuesday | 29 | 25 |\n\n*Use it to answer Questions 15 and 16.*"
                }
              />
              <p className="text-xs text-slate-500">
                Tip: GFM tables (pipe syntax) render in both the admin preview
                and the mobile renderer.
              </p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="imageUrl">
                Image URL{" "}
                <span className="text-xs font-normal text-slate-500">
                  (optional, used for diagrams that don&apos;t render well as
                  markdown)
                </span>
              </Label>
              <Input
                id="imageUrl"
                type="url"
                placeholder="https://…"
                {...form.register("imageUrl")}
              />
            </div>
          </div>

          <DialogFooter className="mt-0 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              {isEdit ? "Save changes" : "Create stimulus"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
