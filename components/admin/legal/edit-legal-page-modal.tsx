"use client";

import { useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
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
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { LegalPage } from "@/types/api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * `null` opens the modal in CREATE mode (slug is editable, blank
   * body). A loaded `LegalPage` opens in EDIT mode — slug becomes
   * read-only because the mobile / web links hard-code the slug.
   */
  page: LegalPage | null;
}

interface FormValues {
  slug: string;
  title: string;
  body: string;
}

export function EditLegalPageModal({ open, onOpenChange, page }: Props) {
  const qc = useQueryClient();
  const isEdit = page !== null;

  const defaultValues = useMemo<FormValues>(
    () => ({
      slug: page?.slug ?? "",
      title: page?.title ?? "",
      body: page?.body ?? "",
    }),
    [page],
  );

  const form = useForm<FormValues>({ defaultValues });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const mutation = useMutation({
    mutationFn: (v: FormValues) =>
      unwrap<LegalPage>(
        api.put(`/admin/legal/${encodeURIComponent(v.slug.trim())}`, {
          title: v.title.trim(),
          body: v.body,
        }),
      ),
    onSuccess: (saved) => {
      toast.success(`Saved '${saved.slug}'`);
      qc.invalidateQueries({ queryKey: QK.LEGAL_PAGES_LIST() });
      onOpenChange(false);
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Save failed"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit legal page" : "New legal page"}
          </DialogTitle>
          <DialogDescription>
            Body is Markdown — rendered as-is by the mobile client.
            Headings (<code>##</code>), lists, links and emphasis all work.
            The slug is the public identifier (e.g.{" "}
            <code>refund-policy</code>) — mobile fetches by exact match.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
          <div className="flex flex-col gap-4">
            <div className="space-y-1">
              <Label htmlFor="slug">
                Slug<span className="text-rose-600"> *</span>
              </Label>
              <Input
                id="slug"
                placeholder="refund-policy"
                readOnly={isEdit}
                className={
                  isEdit ? "bg-slate-50 font-mono" : "font-mono"
                }
                {...form.register("slug", { required: true })}
              />
              {isEdit && (
                <p className="text-xs text-slate-500">
                  Slug is locked. To rename, create a new page and delete
                  this one — but watch for hard-coded links to the old slug
                  in mobile builds.
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="title">
                Title<span className="text-rose-600"> *</span>
              </Label>
              <Input
                id="title"
                placeholder="Refund Policy"
                {...form.register("title", { required: true })}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="body">
                Body (Markdown)<span className="text-rose-600"> *</span>
              </Label>
              <Textarea
                id="body"
                rows={18}
                placeholder={`## Refund Policy\n\n### One-time (Plus) purchases\n…`}
                {...form.register("body", { required: true })}
                className="font-mono text-xs"
              />
            </div>

            <Alert>
              <AlertDescription className="text-xs">
                Mobile links to <code>refund-policy</code> from the checkout
                summary and Settings → Subscription. If you rename or delete
                that slug, update the mobile / web URL constants in the same
                release.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter className="mt-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              {isEdit ? "Save" : "Create page"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
