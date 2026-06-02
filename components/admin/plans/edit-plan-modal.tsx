"use client";

import { useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { AlertTriangle } from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { SubscriptionPlan } from "@/types/api";
import { PlanFormFields, type PlanFormValues } from "./plan-form-fields";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: SubscriptionPlan | null;
}

function fromPlan(plan: SubscriptionPlan): PlanFormValues {
  return {
    name: plan.name,
    description: plan.description ?? "",
    countryCode: plan.countryCode,
    currency: plan.currency,
    provider: plan.provider,
    // account / level / paymentKind are immutable per row — rendered as
    // read-only via `lockStructural` and never sent in the PATCH body.
    account: plan.account,
    level: plan.level,
    paymentKind: plan.paymentKind,
    vatRatePct: String(plan.vatRatePct ?? 0),
    // Prices come back as numbers from the backend (NumericColumnTransformer);
    // the form values are strings because the underlying <Input type="number">
    // emits strings on change. Stringify so the form's resolver doesn't
    // see a type mismatch on first render.
    monthlyPrice: String(plan.monthlyPrice),
    sixMonthPrice: String(plan.sixMonthPrice),
    annualPrice: String(plan.annualPrice),
    monthlyDurationDays: String(plan.monthlyDurationDays),
    sixMonthDurationDays: String(plan.sixMonthDurationDays),
    annualDurationDays: String(plan.annualDurationDays),
    isDefault: plan.isDefault,
  };
}

/**
 * Edit modal. If the admin changes any price or duration, the backend does a
 * version bump (new row, previous archived). Name/description/is_default are
 * in-place cosmetic edits. The modal surfaces which mode the save will take.
 */
export function EditPlanModal({ open, onOpenChange, plan }: Props) {
  const qc = useQueryClient();

  const defaultValues = useMemo(
    () =>
      plan
        ? fromPlan(plan)
        : ({
            name: "",
            description: "",
            countryCode: "",
            currency: "",
            provider: "",
            account: "pro",
            level: "wassce",
            paymentKind: "recurring",
            vatRatePct: "0",
            monthlyPrice: "",
            sixMonthPrice: "",
            annualPrice: "",
            monthlyDurationDays: "",
            sixMonthDurationDays: "",
            annualDurationDays: "",
            isDefault: false,
          } as PlanFormValues),
    [plan],
  );

  const form = useForm<PlanFormValues>({ defaultValues });

  useEffect(() => {
    if (plan) form.reset(fromPlan(plan));
  }, [plan, form]);

  const values = form.watch();
  const priceOrDurationChanged = plan
    ? Number(values.monthlyPrice) !== Number(plan.monthlyPrice) ||
      Number(values.sixMonthPrice) !== Number(plan.sixMonthPrice) ||
      Number(values.annualPrice) !== Number(plan.annualPrice) ||
      Number(values.monthlyDurationDays) !== plan.monthlyDurationDays ||
      Number(values.sixMonthDurationDays) !== plan.sixMonthDurationDays ||
      Number(values.annualDurationDays) !== plan.annualDurationDays
    : false;

  const mutation = useMutation({
    mutationFn: (vals: PlanFormValues) => {
      if (!plan) throw new Error("No plan loaded");
      // account / level / paymentKind are NOT sent — the backend's
      // UpdatePlanDto doesn't accept them. Mutating those would be a
      // different product and goes through Create.
      return unwrap<SubscriptionPlan>(
        api.patch(`/admin/plans/${plan.id}`, {
          name: vals.name.trim(),
          description: vals.description.trim() || null,
          vatRatePct: Number(vals.vatRatePct || 0),
          monthlyPrice: Number(vals.monthlyPrice),
          sixMonthPrice: Number(vals.sixMonthPrice),
          annualPrice: Number(vals.annualPrice),
          monthlyDurationDays: Number(vals.monthlyDurationDays),
          sixMonthDurationDays: Number(vals.sixMonthDurationDays),
          annualDurationDays: Number(vals.annualDurationDays),
          isDefault: vals.isDefault,
        }),
      );
    },
    onSuccess: (next) => {
      if (plan && next.id !== plan.id) {
        toast.success(
          `New version created (v${next.version}). Previous archived.`,
        );
      } else {
        toast.success("Plan updated");
      }
      qc.invalidateQueries({ queryKey: ["plans"] });
      onOpenChange(false);
    },
    onError: (err: { message?: string }) =>
      toast.error(err.message ?? "Failed to update plan"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Edit plan{" "}
            {plan && (
              <span className="text-slate-500 font-normal text-sm">
                · v{plan.version}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            Country, currency, and provider are locked — changing any of those
            is a different product. Create a new plan instead.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
          <PlanFormFields form={form} lockStructural />

          {priceOrDurationChanged && (
            <Alert variant="warning" className="mt-5">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Saving will create a new version</AlertTitle>
              <AlertDescription className="text-xs">
                Provider plans are immutable. The changed cadences will get
                fresh provider plan codes, this row becomes
                <code className="mx-1">Archived v{plan?.version ?? "?"}</code>
                and a new <code className="mx-1">v{(plan?.version ?? 0) + 1}</code>
                row takes its place. Existing subscribers keep billing on the
                old codes.
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter className="mt-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              {priceOrDurationChanged ? "Save & create new version" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
