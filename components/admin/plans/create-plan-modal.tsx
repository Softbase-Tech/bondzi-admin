"use client";

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
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { SubscriptionPlan } from "@/types/api";
import { PlanFormFields, type PlanFormValues } from "./plan-form-fields";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULTS: PlanFormValues = {
  name: "",
  description: "",
  countryCode: "GH",
  currency: "GHS",
  provider: "paystack",
  // Default to Pro × WASSCE: the most-common slot to create. Admin can
  // switch to Plus or another level — switching to Plus auto-zeros the
  // cadence prices via the form's onValueChange handler.
  account: "pro",
  level: "wassce",
  paymentKind: "recurring",
  vatRatePct: "15",
  monthlyPrice: "29.00",
  sixMonthPrice: "150.00",
  annualPrice: "240.00",
  monthlyDurationDays: "30",
  sixMonthDurationDays: "180",
  annualDurationDays: "365",
  isDefault: false,
};

export function CreatePlanModal({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const form = useForm<PlanFormValues>({ defaultValues: DEFAULTS });

  const mutation = useMutation({
    mutationFn: (values: PlanFormValues) => {
      const isOneTime = values.paymentKind === "one_time";
      return unwrap<SubscriptionPlan>(
        api.post("/admin/plans", {
          name: values.name.trim(),
          description: values.description.trim() || undefined,
          countryCode: values.countryCode.toUpperCase(),
          currency: values.currency.toUpperCase(),
          provider: values.provider.trim().toLowerCase(),
          account: values.account,
          level: values.level,
          paymentKind: values.paymentKind,
          vatRatePct: Number(values.vatRatePct || 0),
          monthlyPrice: Number(values.monthlyPrice),
          // Backend rejects non-zero cadence prices on one-time plans.
          // The form already zeroes these when payment kind flips to
          // one-time, so this is belt-and-braces.
          sixMonthPrice: isOneTime ? undefined : Number(values.sixMonthPrice),
          annualPrice: isOneTime ? undefined : Number(values.annualPrice),
          monthlyDurationDays: Number(values.monthlyDurationDays),
          sixMonthDurationDays: Number(values.sixMonthDurationDays),
          annualDurationDays: Number(values.annualDurationDays),
          isDefault: values.isDefault,
          syncProvider: !isOneTime,
        }),
      );
    },
    onSuccess: (plan) => {
      toast.success(`Plan "${plan.name}" created`);
      qc.invalidateQueries({ queryKey: ["plans"] });
      form.reset(DEFAULTS);
      onOpenChange(false);
    },
    onError: (err: { message?: string }) =>
      toast.error(err.message ?? "Failed to create plan"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create plan</DialogTitle>
          <DialogDescription>
            Saving creates the three cadence plans on the selected provider
            and stores their codes. If any provider call fails, the plan is
            still saved — retry via <code>Sync</code> on the row.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
          <PlanFormFields form={form} />

          <Alert className="mt-5">
            <AlertDescription className="text-xs">
              3 Paystack plans will be created: monthly, 6-month (biannually),
              annual. Existing subscribers on older plans keep their billing
              unchanged.
            </AlertDescription>
          </Alert>

          <DialogFooter className="mt-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              Create plan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
