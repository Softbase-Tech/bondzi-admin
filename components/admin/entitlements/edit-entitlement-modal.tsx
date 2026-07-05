"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type {
  AccountType,
  EntitlementPolicy,
  EntitlementServiceKey,
} from "@/types/api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier: AccountType;
  service: EntitlementServiceKey;
  serviceLabel: string;
  policy: EntitlementPolicy;
}

/**
 * Edits one cell of the tier × service matrix. Independent controls:
 *   - `enabled` toggle (off = 403 for that tier)
 *   - dailyCap: number OR the `unlimitedCap` switch (writes NULL)
 *   - config: JSON textarea, validated locally before submit so a
 *     mistyped brace doesn't hit the backend
 *
 * PATCH `/admin/entitlements/:tier/:service` accepts the trio
 * independently, so we send only the fields that changed. The
 * backend stamps `updatedBy` on save.
 */
export function EditEntitlementModal({
  open,
  onOpenChange,
  tier,
  service,
  serviceLabel,
  policy,
}: Props) {
  const qc = useQueryClient();

  const [enabled, setEnabled] = useState(policy.enabled);
  const [unlimitedCap, setUnlimitedCap] = useState(policy.dailyCap === null);
  const [dailyCap, setDailyCap] = useState<string>(
    policy.dailyCap == null ? "" : String(policy.dailyCap),
  );
  const [configText, setConfigText] = useState<string>(
    JSON.stringify(policy.config ?? {}, null, 2),
  );
  const [configError, setConfigError] = useState<string | null>(null);

  // When the parent picks a different cell, reset the form fields.
  useEffect(() => {
    setEnabled(policy.enabled);
    setUnlimitedCap(policy.dailyCap === null);
    setDailyCap(policy.dailyCap == null ? "" : String(policy.dailyCap));
    setConfigText(JSON.stringify(policy.config ?? {}, null, 2));
    setConfigError(null);
  }, [policy]);

  const save = useMutation({
    mutationFn: async () => {
      // Local JSON validation before we spend a round-trip.
      let parsedConfig: Record<string, unknown> | undefined;
      const trimmed = configText.trim();
      if (trimmed.length === 0) {
        parsedConfig = {};
      } else {
        try {
          const val = JSON.parse(trimmed) as unknown;
          if (
            val === null ||
            typeof val !== "object" ||
            Array.isArray(val)
          ) {
            throw new Error("must be a JSON object");
          }
          parsedConfig = val as Record<string, unknown>;
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "invalid JSON";
          setConfigError(message);
          throw new Error(`Config JSON is invalid: ${message}`);
        }
      }

      // Build the patch body — only include fields that actually
      // changed. Keeps the audit trail clean (updatedBy stamps but
      // updatedAt on a no-op patch is still noise).
      const body: {
        enabled?: boolean;
        dailyCap?: number;
        unlimitedCap?: boolean;
        config?: Record<string, unknown>;
      } = {};
      if (enabled !== policy.enabled) body.enabled = enabled;
      if (unlimitedCap && policy.dailyCap !== null) {
        body.unlimitedCap = true;
      } else if (!unlimitedCap) {
        const n = Number(dailyCap);
        if (!Number.isFinite(n) || n < 0) {
          throw new Error("Daily cap must be a non-negative number");
        }
        if (n !== policy.dailyCap) body.dailyCap = n;
      }
      const currentConfig = JSON.stringify(policy.config ?? {});
      if (JSON.stringify(parsedConfig ?? {}) !== currentConfig) {
        body.config = parsedConfig ?? {};
      }
      if (Object.keys(body).length === 0) {
        throw new Error("Nothing changed.");
      }
      await unwrap(
        api.patch(`/admin/entitlements/${tier}/${service}`, body),
      );
    },
    onSuccess: () => {
      toast.success(`Updated ${tier} / ${service}`);
      qc.invalidateQueries({ queryKey: QK.ENTITLEMENTS_MATRIX() });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Save failed";
      toast.error(message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {serviceLabel} — <span className="capitalize">{tier}</span>
          </DialogTitle>
          <p className="text-xs text-slate-500">
            <code className="font-mono">{service}</code>. Changes take effect
            immediately for every request that hits{" "}
            <code className="font-mono">@RequiresService(...)</code>.
          </p>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label className="text-sm font-medium">Enabled</Label>
              <p className="text-xs text-slate-500">
                Off → 403 &quot;not on your tier&quot; on every call.
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="rounded-md border p-3">
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-sm font-medium">Daily cap</Label>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Unlimited</Label>
                <Switch
                  checked={unlimitedCap}
                  onCheckedChange={setUnlimitedCap}
                />
              </div>
            </div>
            {unlimitedCap ? (
              <p className="text-xs text-slate-500">
                No enforcement — every call goes through. Usage is still
                tracked in <code className="font-mono">user_service_usage</code>{" "}
                for analytics.
              </p>
            ) : (
              <>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={dailyCap}
                  onChange={(e) => setDailyCap(e.target.value)}
                  placeholder="e.g. 20"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Requests beyond this count on the same Accra day are 429ed.
                  0 with Enabled=on is a valid &quot;kill switch&quot; state.
                </p>
              </>
            )}
          </div>

          <div className="rounded-md border p-3">
            <Label className="text-sm font-medium">Config (JSON)</Label>
            <p className="mb-1 text-xs text-slate-500">
              Free-form per-service flags.{" "}
              <code className="font-mono">requiresFormLevel: true</code> on{" "}
              <code className="font-mono">level_tests</code> refuses NOVDEC
              students. Empty object = no flags.
            </p>
            <Textarea
              rows={5}
              value={configText}
              onChange={(e) => {
                setConfigText(e.target.value);
                setConfigError(null);
              }}
              className="font-mono text-xs"
            />
            {configError && (
              <p className="mt-1 text-xs text-red-600">{configError}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={save.isPending}
          >
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} loading={save.isPending}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
