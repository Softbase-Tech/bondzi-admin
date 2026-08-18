"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { QK } from "@/lib/query-keys";

const EMAIL_MAX = 254;
const PHONE_MAX = 20;

/**
 * Admin: edit a user's email and/or phone. Slides in from the side
 * so the underlying user detail page stays visible for context.
 *
 * Diffing rules on the wire:
 *   - Trimmed value === original → field is NOT included in the
 *     PATCH body (undefined = "leave alone" on the server).
 *   - Trimmed value === "" → send null to explicitly clear.
 *   - Anything else → send the trimmed value.
 *
 * That lets the reviewer edit ONLY the email without accidentally
 * blanking the phone. Sending an unchanged field would still be
 * safe (the service short-circuits) but the audit log would
 * record a no-op event we'd rather not have.
 */
export function EditContactSheet({
  userId,
  recipientName,
  initialEmail,
  initialPhone,
}: {
  userId: string;
  recipientName: string;
  initialEmail: string | null;
  initialPhone: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(initialEmail ?? "");
  const [phone, setPhone] = useState(initialPhone ?? "");
  const qc = useQueryClient();

  // Sync when the sheet re-opens on a user whose values changed
  // (e.g. right after another admin patched them on a live board).
  useEffect(() => {
    if (open) {
      setEmail(initialEmail ?? "");
      setPhone(initialPhone ?? "");
    }
  }, [open, initialEmail, initialPhone]);

  const patch = useMutation({
    mutationFn: () => {
      const body: { email?: string | null; phone?: string | null } = {};
      const trimmedEmail = email.trim();
      const trimmedPhone = phone.trim();
      if (trimmedEmail !== (initialEmail ?? "")) {
        body.email = trimmedEmail === "" ? null : trimmedEmail;
      }
      if (trimmedPhone !== (initialPhone ?? "")) {
        body.phone = trimmedPhone === "" ? null : trimmedPhone;
      }
      return api.patch(`/admin/users/${userId}/contact`, body);
    },
    onSuccess: () => {
      toast.success(`Contact updated for ${recipientName}`);
      qc.invalidateQueries({ queryKey: QK.USER_DETAIL(userId) });
      setOpen(false);
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Update failed"),
  });

  const emailChanged = email.trim() !== (initialEmail ?? "");
  const phoneChanged = phone.trim() !== (initialPhone ?? "");
  const canSubmit =
    (emailChanged || phoneChanged) &&
    email.length <= EMAIL_MAX &&
    phone.length <= PHONE_MAX &&
    !patch.isPending;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
          <Pencil className="h-3 w-3" /> Edit
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Edit contact — {recipientName}</SheetTitle>
          <SheetDescription>
            Changing the email drops the user&apos;s email-verified
            state — they&apos;ll see the &quot;Verify your email&quot;
            banner again until they confirm the new address. Uniqueness
            is enforced server-side; a collision returns a clear error.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 py-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              value={email}
              maxLength={EMAIL_MAX}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@example.com"
              autoFocus
            />
            <p className="text-xs text-slate-500">
              Leave blank to clear. Normalised to lowercase on save.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-phone">Phone</Label>
            <Input
              id="edit-phone"
              type="tel"
              value={phone}
              maxLength={PHONE_MAX}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+233 24 000 0000"
            />
            <p className="text-xs text-slate-500">
              Ghana format. E.164 (+233…) is recommended. Leave blank
              to clear.
            </p>
          </div>
        </div>

        <SheetFooter className="flex flex-row justify-end gap-2 px-4 pb-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => patch.mutate()}
            disabled={!canSubmit}
            loading={patch.isPending}
          >
            Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
