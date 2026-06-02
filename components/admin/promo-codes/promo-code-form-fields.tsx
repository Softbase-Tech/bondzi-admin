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
import type {
  AccountType,
  PlanLevel,
  PromoDiscountType,
} from "@/types/api";

export interface PromoCodeFormValues {
  code: string;
  description: string;
  discountType: PromoDiscountType;
  discountValue: string;
  /** 'any' is the form sentinel for "no scope restriction" (NULL on the wire). */
  applicableAccount: AccountType | "any";
  applicableLevel: PlanLevel | "any";
  /** Empty string = no cap (unlimited). */
  maxRedemptions: string;
  /** Empty string = valid immediately / no end. ISO datetime when set. */
  validFrom: string;
  validUntil: string;
  isActive: boolean;
}

interface Props {
  form: UseFormReturn<PromoCodeFormValues>;
  /** Edit mode locks the slot-defining fields (code, discountType, scope). */
  mode: "create" | "edit";
}

export function PromoCodeFormFields({ form, mode }: Props) {
  const values = form.watch();
  const locked = mode === "edit";

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          label="Code"
          htmlFor="code"
          hint="Stored lowercased — case-insensitive at redemption."
          required
        >
          <Input
            id="code"
            placeholder="WELCOME20"
            readOnly={locked}
            className={locked ? "bg-slate-50 font-mono" : "font-mono"}
            {...form.register("code", { required: true })}
          />
        </Field>
        <Field
          label="Discount type"
          htmlFor="discountType"
          required
          hint={
            values.discountType === "percent"
              ? "Percent off the gross price."
              : "Fixed amount off (in plan currency)."
          }
        >
          <Select
            value={values.discountType}
            onValueChange={(v: PromoDiscountType) =>
              form.setValue("discountType", v, { shouldDirty: true })
            }
            disabled={locked}
          >
            <SelectTrigger id="discountType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percent">Percent</SelectItem>
              <SelectItem value="fixed">Fixed amount</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field
        label={
          values.discountType === "percent"
            ? "Discount (% — 0–100)"
            : "Discount amount (in plan currency)"
        }
        htmlFor="discountValue"
        required
      >
        <Input
          id="discountValue"
          type="number"
          step="0.01"
          min="0"
          {...form.register("discountValue", { required: true })}
        />
      </Field>

      <Field
        label="Description (internal)"
        htmlFor="description"
        hint="Note for admin — never shown to users."
      >
        <Textarea
          id="description"
          rows={2}
          placeholder="Summer-launch promo, 20% off Plus only."
          {...form.register("description")}
        />
      </Field>

      {/* ─── Scope ──────────────────────────────────────────────────── */}
      <div className="rounded-md border border-slate-200 p-4 space-y-4">
        <div className="text-sm font-medium text-slate-900">Scope</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Account"
            htmlFor="applicableAccount"
            hint="Restrict to one account grade. 'Any' = applies to Plus AND Pro."
          >
            <Select
              value={values.applicableAccount}
              onValueChange={(v: AccountType | "any") =>
                form.setValue("applicableAccount", v, { shouldDirty: true })
              }
              disabled={locked}
            >
              <SelectTrigger id="applicableAccount">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="plus">Plus only</SelectItem>
                <SelectItem value="pro">Pro only</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field
            label="Level"
            htmlFor="applicableLevel"
            hint="Restrict to one exam level. 'Any' = applies across BECE / WASSCE / NOVDEC."
          >
            <Select
              value={values.applicableLevel}
              onValueChange={(v: PlanLevel | "any") =>
                form.setValue("applicableLevel", v, { shouldDirty: true })
              }
              disabled={locked}
            >
              <SelectTrigger id="applicableLevel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="bece">BECE</SelectItem>
                <SelectItem value="wassce">WASSCE</SelectItem>
                <SelectItem value="novdec">NOVDEC</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </div>

      {/* ─── Limits + window ────────────────────────────────────────── */}
      <div className="rounded-md border border-slate-200 p-4 space-y-4">
        <div className="text-sm font-medium text-slate-900">Limits</div>
        <Field
          label="Max redemptions"
          htmlFor="maxRedemptions"
          hint="Total redemptions cap across ALL users. Leave blank for unlimited."
        >
          <Input
            id="maxRedemptions"
            type="number"
            min="1"
            placeholder="unlimited"
            {...form.register("maxRedemptions")}
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Valid from"
            htmlFor="validFrom"
            hint="Leave blank = active immediately."
          >
            <Input
              id="validFrom"
              type="datetime-local"
              readOnly={locked}
              className={locked ? "bg-slate-50" : ""}
              {...form.register("validFrom")}
            />
          </Field>
          <Field
            label="Valid until"
            htmlFor="validUntil"
            hint="Leave blank = never expires."
          >
            <Input
              id="validUntil"
              type="datetime-local"
              {...form.register("validUntil")}
            />
          </Field>
        </div>
      </div>

      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" {...form.register("isActive")} />
        Active — disabled codes won&apos;t apply even within their window
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
