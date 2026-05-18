"use client";

import type { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatGHS } from "@/lib/utils";

export interface PlanFormValues {
  name: string;
  description: string;
  countryCode: string;
  currency: string;
  provider: string;
  monthlyPrice: string;
  sixMonthPrice: string;
  annualPrice: string;
  monthlyDurationDays: string;
  sixMonthDurationDays: string;
  annualDurationDays: string;
  isDefault: boolean;
}

interface Props {
  form: UseFormReturn<PlanFormValues>;
  /**
   * When true, country / currency / provider render as read-only text.
   * Used in edit mode where those fields are structurally locked — changing
   * any of them creates a different product; admin must make a new plan.
   */
  lockStructural?: boolean;
}

/**
 * Shared form fields used by both the create and edit plan modals. Kept in
 * one place so the two modals stay visually identical and the set of fields
 * is the single source of truth.
 */
export function PlanFormFields({ form, lockStructural }: Props) {
  const values = form.watch();

  const monthly = Number(values.monthlyPrice || 0);
  const sixMonth = Number(values.sixMonthPrice || 0);
  const annual = Number(values.annualPrice || 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Plan name" htmlFor="name" required>
          <Input
            id="name"
            placeholder="Bondzi Pro GH"
            {...form.register("name", { required: true })}
          />
        </Field>
        <Field
          label="Country code"
          htmlFor="countryCode"
          hint="ISO 3166 alpha-2 (GH, NG, …)"
          required
        >
          <Input
            id="countryCode"
            maxLength={2}
            readOnly={lockStructural}
            className={lockStructural ? "bg-slate-50" : ""}
            {...form.register("countryCode", { required: true })}
          />
        </Field>
      </div>

      <Field label="Description" htmlFor="description">
        <Textarea
          id="description"
          rows={2}
          placeholder="Shown in the mobile app plan picker."
          {...form.register("description")}
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Currency" htmlFor="currency" hint="ISO 4217" required>
          <Input
            id="currency"
            maxLength={3}
            readOnly={lockStructural}
            className={lockStructural ? "bg-slate-50" : ""}
            {...form.register("currency", { required: true })}
          />
        </Field>
        <Field
          label="Payment provider"
          htmlFor="provider"
          hint="Must match a registered provider (paystack, stripe, …)"
          required
        >
          <Input
            id="provider"
            readOnly={lockStructural}
            className={lockStructural ? "bg-slate-50" : ""}
            {...form.register("provider", { required: true })}
          />
        </Field>
      </div>

      <div className="rounded-md border border-slate-200 p-4 space-y-4">
        <div className="text-sm font-medium text-slate-900">
          Pricing &amp; duration
        </div>
        <CadenceRow
          label="Monthly"
          priceId="monthlyPrice"
          durationId="monthlyDurationDays"
          form={form}
          preview={monthly}
        />
        <CadenceRow
          label="6-month"
          priceId="sixMonthPrice"
          durationId="sixMonthDurationDays"
          form={form}
          preview={sixMonth}
        />
        <CadenceRow
          label="Annual"
          priceId="annualPrice"
          durationId="annualDurationDays"
          form={form}
          preview={annual}
        />
      </div>

      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" {...form.register("isDefault")} />
        Mark as the default plan for this country
      </label>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="text-rose-600"> *</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function CadenceRow({
  label,
  priceId,
  durationId,
  form,
  preview,
}: {
  label: string;
  priceId: keyof PlanFormValues;
  durationId: keyof PlanFormValues;
  form: UseFormReturn<PlanFormValues>;
  preview: number;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
      <Field label={`${label} price (GHS)`} htmlFor={String(priceId)} required>
        <Input
          id={String(priceId)}
          type="number"
          step="0.01"
          min="0.01"
          {...form.register(priceId, { required: true })}
        />
      </Field>
      <Field
        label={`${label} duration (days)`}
        htmlFor={String(durationId)}
        required
      >
        <Input
          id={String(durationId)}
          type="number"
          min="1"
          {...form.register(durationId, { required: true })}
        />
      </Field>
      <div className="text-xs text-slate-500 pb-2.5">
        Preview: <span className="text-slate-900">{formatGHS(preview)}</span>
      </div>
    </div>
  );
}
