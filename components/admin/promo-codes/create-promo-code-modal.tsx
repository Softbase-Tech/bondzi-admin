"use client";

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
import type { PromoCode } from "@/types/api";
import {
  PromoCodeFormFields,
  type PromoCodeFormValues,
} from "./promo-code-form-fields";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULTS: PromoCodeFormValues = {
  code: "",
  description: "",
  discountType: "percent",
  discountValue: "20",
  applicableAccount: "any",
  applicableLevel: "any",
  maxRedemptions: "",
  validFrom: "",
  validUntil: "",
  isActive: true,
};

export function CreatePromoCodeModal({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const form = useForm<PromoCodeFormValues>({ defaultValues: DEFAULTS });

  const mutation = useMutation({
    mutationFn: (v: PromoCodeFormValues) =>
      unwrap<PromoCode>(
        api.post("/admin/promo-codes", {
          code: v.code.trim(),
          description: v.description.trim() || undefined,
          discountType: v.discountType,
          discountValue: Number(v.discountValue),
          // 'any' is the form's sentinel for "no restriction" — translate
          // to undefined so the backend nullable column gets the right value.
          applicableAccount:
            v.applicableAccount === "any" ? undefined : v.applicableAccount,
          applicableLevel:
            v.applicableLevel === "any" ? undefined : v.applicableLevel,
          maxRedemptions: v.maxRedemptions
            ? Number(v.maxRedemptions)
            : undefined,
          validFrom: v.validFrom || undefined,
          validUntil: v.validUntil || undefined,
          isActive: v.isActive,
        }),
      ),
    onSuccess: (created) => {
      toast.success(`Promo code '${created.code}' created`);
      qc.invalidateQueries({ queryKey: QK.PROMO_CODES_LIST() });
      form.reset(DEFAULTS);
      onOpenChange(false);
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Failed to create promo code"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New promo code</DialogTitle>
          <DialogDescription>
            Codes are case-insensitive at redemption. Scope filters narrow
            which plans the code can be applied to — leave them at &ldquo;Any&rdquo;
            for a global discount.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
          <PromoCodeFormFields form={form} mode="create" />
          <DialogFooter className="mt-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              Create code
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
