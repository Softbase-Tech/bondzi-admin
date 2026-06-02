"use client";

import type { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatGHS } from "@/lib/utils";
import type { AccountType, PaymentKind, PlanLevel } from "@/types/api";

export interface PlanFormValues {
  name: string;
  description: string;
  countryCode: string;
  currency: string;
  provider: string;
  /** Plan grade — drives the entitlement gates. */
  account: AccountType;
  /** Level the plan unlocks. */
  level: PlanLevel;
  /** One-time (Plus, lifetime) vs recurring (Pro). */
  paymentKind: PaymentKind;
  /** VAT rate baked into the displayed (inclusive) price. */
  vatRatePct: string;
  monthlyPrice: string;
  /** Required for recurring plans; ignored (and forced to 0) for one-time. */
  sixMonthPrice: string;
  /** Required for recurring plans; ignored (and forced to 0) for one-time. */
  annualPrice: string;
  monthlyDurationDays: string;
  sixMonthDurationDays: string;
  annualDurationDays: string;
  isDefault: boolean;
}

interface Props {
  form: UseFormReturn<PlanFormValues>;
  /**
   * When true, country / currency / provider AND the slot-defining fields
   * (account / level / paymentKind) render as read-only. Used in edit mode
   * — changing any of those is conceptually a different product and must
   * go through Create.
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
  const isOneTime = values.paymentKind === "one_time";

  const monthly = Number(values.monthlyPrice || 0);
  const sixMonth = Number(values.sixMonthPrice || 0);
  const annual = Number(values.annualPrice || 0);
  const vatRate = Number(values.vatRatePct || 0);
  const vatNet = vatRate > 0 ? monthly / (1 + vatRate / 100) : monthly;
  const vatPortion = monthly - vatNet;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Plan name" htmlFor="name" required>
          <Input
            id="name"
            placeholder="Bondzi Pro · WASSCE"
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

      {/* ─── Slot-defining fields: account × level × payment kind ─── */}
      <div className="rounded-md border border-slate-200 p-4 space-y-4">
        <div className="text-sm font-medium text-slate-900">
          Account &amp; level
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Account" htmlFor="account" required>
            <Select
              value={values.account}
              onValueChange={(v: AccountType) =>
                form.setValue("account", v, { shouldDirty: true })
              }
              disabled={lockStructural}
            >
              <SelectTrigger id="account">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="plus">Plus (one-time)</SelectItem>
                <SelectItem value="pro">Pro (recurring)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Level" htmlFor="level" required>
            <Select
              value={values.level}
              onValueChange={(v: PlanLevel) =>
                form.setValue("level", v, { shouldDirty: true })
              }
              disabled={lockStructural}
            >
              <SelectTrigger id="level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bece">BECE (JHS)</SelectItem>
                <SelectItem value="wassce">WASSCE (SHS)</SelectItem>
                <SelectItem value="novdec">NOVDEC (Remedial)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field
            label="Payment kind"
            htmlFor="paymentKind"
            required
            hint={
              isOneTime
                ? "Lifetime grant after a single charge."
                : "Paystack-managed recurring subscription."
            }
          >
            <Select
              value={values.paymentKind}
              onValueChange={(v: PaymentKind) => {
                form.setValue("paymentKind", v, { shouldDirty: true });
                // Switching to one-time wipes the cadence prices to 0
                // so the backend's invariant ("Plus must not carry
                // 6mo/annual prices") holds at save time.
                if (v === "one_time") {
                  form.setValue("sixMonthPrice", "0");
                  form.setValue("annualPrice", "0");
                }
              }}
              disabled={lockStructural}
            >
              <SelectTrigger id="paymentKind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="one_time">One-time</SelectItem>
                <SelectItem value="recurring">Recurring</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </div>

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

      <Field
        label="VAT rate (%)"
        htmlFor="vatRatePct"
        hint={`Inclusive — the displayed price already contains VAT. At ${vatRate}% on ${formatGHS(monthly)}: net ≈ ${formatGHS(vatNet)}, VAT ≈ ${formatGHS(vatPortion)}.`}
      >
        <Input
          id="vatRatePct"
          type="number"
          step="0.01"
          min="0"
          max="100"
          {...form.register("vatRatePct")}
        />
      </Field>

      <div className="rounded-md border border-slate-200 p-4 space-y-4">
        <div className="text-sm font-medium text-slate-900">
          {isOneTime ? "Headline price" : "Pricing & duration"}
        </div>
        {isOneTime ? (
          <CadenceRow
            label="One-time"
            priceId="monthlyPrice"
            durationId="monthlyDurationDays"
            form={form}
            preview={monthly}
            hideDuration
          />
        ) : (
          <>
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
          </>
        )}
        {isOneTime && (
          <Alert>
            <AlertDescription className="text-xs">
              One-time plans charge the headline price once. The user gets
              lifetime access for this level — no recurring billing, no
              Paystack subscription, no plan code synced.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" {...form.register("isDefault")} />
        Mark as the default plan for this (country, account, level) slot
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
  hideDuration,
}: {
  label: string;
  priceId: keyof PlanFormValues;
  durationId: keyof PlanFormValues;
  form: UseFormReturn<PlanFormValues>;
  preview: number;
  hideDuration?: boolean;
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
      {hideDuration ? (
        <div />
      ) : (
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
      )}
      <div className="text-xs text-slate-500 pb-2.5">
        Preview: <span className="text-slate-900">{formatGHS(preview)}</span>
      </div>
    </div>
  );
}
