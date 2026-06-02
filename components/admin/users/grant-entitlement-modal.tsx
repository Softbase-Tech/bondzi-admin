"use client";

import { useEffect, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { AccountType, PlanLevel } from "@/types/api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  /** Pre-selected level (the row the admin clicked Grant on). */
  level: PlanLevel | null;
  onSaved: () => void;
}

interface FormValues {
  account: Exclude<AccountType, "free">;
  expiresAt: string; // ISO local datetime; required for Pro, ignored for Plus
  reason: string;
}

/**
 * Manual entitlement grant. Plus is lifetime (expiresAt is hidden); Pro
 * needs an explicit expires_at. Reason is required and lands in the
 * audit_log row's metadata so support can always answer "why does this
 * user have Pro for free?"
 */
export function GrantEntitlementModal({
  open,
  onOpenChange,
  userId,
  level,
  onSaved,
}: Props) {
  const defaultValues = useMemo<FormValues>(
    () => ({
      account: "plus",
      // Default Pro expiry to 30 days out — picked at render time, not
      // build time, so the picker shows a sensible value each open.
      expiresAt: defaultExpiry30dIso(),
      reason: "",
    }),
    [],
  );

  const form = useForm<FormValues>({ defaultValues });
  const values = form.watch();

  useEffect(() => {
    if (open) form.reset(defaultValues);
  }, [open, form, defaultValues]);

  const mutation = useMutation({
    mutationFn: (v: FormValues) => {
      if (!level) throw new Error("No level selected");
      return unwrap<unknown>(
        api.post("/admin/entitlements/grant", {
          userId,
          level,
          account: v.account,
          // Plus is lifetime — omit expiresAt entirely. The backend
          // 400s if a Plus grant carries one.
          expiresAt:
            v.account === "pro" && v.expiresAt
              ? new Date(v.expiresAt).toISOString()
              : undefined,
          reason: v.reason.trim(),
        }),
      );
    },
    onSuccess: () => {
      toast.success("Entitlement granted");
      onSaved();
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Grant failed"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Grant entitlement
            {level && (
              <span className="ml-2 text-slate-500 font-normal text-sm">
                · {level.toUpperCase()}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            Manually grants this user the selected account on{" "}
            <span className="font-medium">{level?.toUpperCase()}</span>.
            Logged to the audit trail.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
          <div className="flex flex-col gap-4">
            <div className="space-y-1">
              <Label htmlFor="account">
                Account<span className="text-rose-600"> *</span>
              </Label>
              <Select
                value={values.account}
                onValueChange={(v) =>
                  form.setValue("account", v as FormValues["account"], {
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger id="account">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="plus">Plus (lifetime)</SelectItem>
                  <SelectItem value="pro">Pro (time-bounded)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {values.account === "pro" && (
              <div className="space-y-1">
                <Label htmlFor="expiresAt">
                  Expires at<span className="text-rose-600"> *</span>
                </Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  {...form.register("expiresAt", { required: true })}
                />
                <p className="text-xs text-slate-500">
                  Pro grants need an explicit end. Plus is lifetime and
                  ignores this field.
                </p>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="reason">
                Reason<span className="text-rose-600"> *</span>
              </Label>
              <Textarea
                id="reason"
                rows={3}
                placeholder='"Beta tester", "Refund goodwill #12345", "Sponsor request — Asantewaa High"'
                {...form.register("reason", { required: true, minLength: 4 })}
              />
            </div>

            <Alert>
              <AlertDescription className="text-xs">
                Manual grants are stored with{" "}
                <code>provider=&apos;manual&apos;</code> so they never
                collide with Paystack-driven rows. The user&apos;s
                entitlement cache is invalidated immediately — access
                lands within seconds of saving.
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
              Grant
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function defaultExpiry30dIso(): string {
  const d = new Date(Date.now() + 30 * 24 * 3600 * 1000);
  // datetime-local needs "YYYY-MM-DDTHH:mm" without timezone.
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}
