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
import type { PromoCode } from "@/types/api";
import {
  PromoCodeFormFields,
  type PromoCodeFormValues,
} from "./promo-code-form-fields";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promoCode: PromoCode | null;
}

function fromPromoCode(c: PromoCode): PromoCodeFormValues {
  return {
    code: c.code,
    description: c.description ?? "",
    discountType: c.discountType,
    discountValue: c.discountValue,
    applicableAccount: c.applicableAccount ?? "any",
    applicableLevel: c.applicableLevel ?? "any",
    maxRedemptions:
      c.maxRedemptions !== null ? String(c.maxRedemptions) : "",
    validFrom: c.validFrom ?? "",
    validUntil: c.validUntil ?? "",
    isActive: c.isActive,
  };
}

/**
 * Edit modal for an existing promo code. The backend's UpdatePromoCodeDto
 * only accepts cosmetic + status fields — code string, discount type,
 * and scope are immutable. The form locks those read-only.
 */
export function EditPromoCodeModal({ open, onOpenChange, promoCode }: Props) {
  const qc = useQueryClient();

  const defaultValues = useMemo<PromoCodeFormValues>(
    () =>
      promoCode
        ? fromPromoCode(promoCode)
        : {
            code: "",
            description: "",
            discountType: "percent",
            discountValue: "",
            applicableAccount: "any",
            applicableLevel: "any",
            maxRedemptions: "",
            validFrom: "",
            validUntil: "",
            isActive: true,
          },
    [promoCode],
  );

  const form = useForm<PromoCodeFormValues>({ defaultValues });

  useEffect(() => {
    if (promoCode) form.reset(fromPromoCode(promoCode));
  }, [promoCode, form]);

  const mutation = useMutation({
    mutationFn: (v: PromoCodeFormValues) => {
      if (!promoCode) throw new Error("No promo code loaded");
      return unwrap<PromoCode>(
        api.patch(`/admin/promo-codes/${promoCode.id}`, {
          description: v.description.trim() || null,
          discountValue: Number(v.discountValue),
          maxRedemptions: v.maxRedemptions
            ? Number(v.maxRedemptions)
            : undefined,
          validUntil: v.validUntil || undefined,
          isActive: v.isActive,
        }),
      );
    },
    onSuccess: () => {
      toast.success("Promo code updated");
      qc.invalidateQueries({ queryKey: QK.PROMO_CODES_LIST() });
      onOpenChange(false);
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Failed to update promo code"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Edit promo code{" "}
            {promoCode && (
              <span className="text-slate-500 font-mono text-sm font-normal">
                · {promoCode.code}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            Code string, discount type, and scope are locked — those define
            what the code is. Create a new code to change them.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
          <PromoCodeFormFields form={form} mode="edit" />
          <DialogFooter className="mt-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
