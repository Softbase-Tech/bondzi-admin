"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * Confirmation dialog with a mandatory free-text reason. Used for
 * suspend / ban / mark-failed workflows — anywhere the audit trail
 * requires the admin to justify a destructive action.
 */
export function ApproveOrHoldDialog({
  open,
  title,
  description,
  confirmLabel,
  destructive,
  onCancel,
  onConfirm,
  isPending,
  minLength = 3,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
  isPending: boolean;
  minLength?: number;
}) {
  const [reason, setReason] = useState("");
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (!open) setReason("");
  }
  const canConfirm = reason.trim().length >= minLength;
  return (
    <Dialog open={open} onOpenChange={(v) => (v ? undefined : onCancel())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600">{description}</p>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason — shown to the partner in the email + logged for audit."
          rows={4}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={!canConfirm || isPending}
            onClick={() => onConfirm(reason.trim())}
          >
            {isPending ? "Saving…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
