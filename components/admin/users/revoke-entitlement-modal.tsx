"use client";

import { useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { UserEntitlement } from "@/types/api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  entitlement: UserEntitlement | null;
  onSaved: () => void;
}

interface FormValues {
  refund: boolean;
  reason: string;
}

/**
 * Revokes the user's entitlement on the selected level. Two modes:
 *
 *   - refund=false (default): flips status to CANCELLED. Access stops
 *     immediately; no refund is implied.
 *   - refund=true: flips to REFUNDED. Use ONLY after a refund has been
 *     processed out-of-band (manual Paystack refund, bank reversal,
 *     comp). This endpoint does NOT call Paystack.
 */
export function RevokeEntitlementModal({
  open,
  onOpenChange,
  userId,
  entitlement,
  onSaved,
}: Props) {
  const form = useForm<FormValues>({
    defaultValues: { refund: false, reason: "" },
  });

  useEffect(() => {
    if (open) form.reset({ refund: false, reason: "" });
  }, [open, form]);

  const values = form.watch();

  const mutation = useMutation({
    mutationFn: (v: FormValues) => {
      if (!entitlement) throw new Error("No entitlement selected");
      return unwrap<unknown>(
        api.post("/admin/entitlements/revoke", {
          userId,
          level: entitlement.level,
          refund: v.refund,
          reason: v.reason.trim(),
        }),
      );
    },
    onSuccess: () => {
      toast.success(values.refund ? "Refund recorded" : "Entitlement revoked");
      onSaved();
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Revoke failed"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Revoke entitlement
            {entitlement && (
              <span className="ml-2 text-slate-500 font-normal text-sm">
                · {entitlement.account.toUpperCase()} on{" "}
                {entitlement.level.toUpperCase()}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            Removes the user&apos;s paid access for this level. Logged to
            the audit trail.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
          <div className="flex flex-col gap-4">
            <label className="inline-flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                {...form.register("refund")}
              />
              <span>
                <span className="font-medium">Mark as refunded</span>
                <span className="block text-xs text-slate-500">
                  Use only when a refund was already issued out-of-band
                  (manual Paystack refund, bank reversal, comp). This does
                  NOT call Paystack — flip the subscription to REFUNDED
                  for accounting only.
                </span>
              </span>
            </label>

            <div className="space-y-1">
              <Label htmlFor="reason">
                Reason<span className="text-rose-600"> *</span>
              </Label>
              <Textarea
                id="reason"
                rows={3}
                placeholder='"Abuse", "Charge dispute won", "User requested refund — comped"'
                {...form.register("reason", { required: true, minLength: 4 })}
              />
            </div>

            <Alert>
              <AlertDescription className="text-xs">
                Status flips to{" "}
                <code>{values.refund ? "REFUNDED" : "CANCELLED"}</code>.
                The user loses access for{" "}
                <strong>{entitlement?.level?.toUpperCase()}</strong>{" "}
                immediately. Their entitlement on other levels is
                untouched.
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
            <Button
              type="submit"
              loading={mutation.isPending}
              variant={values.refund ? "default" : "destructive"}
            >
              {values.refund ? "Mark refunded" : "Revoke access"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
