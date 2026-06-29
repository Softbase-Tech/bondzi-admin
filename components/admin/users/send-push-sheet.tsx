"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Send } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";

const TITLE_MAX = 80;
const BODY_MAX = 280;
const DEEP_LINK_MAX = 200;

/**
 * Admin: compose a push notification and send it to ONE user.
 * Renders as a side sheet trigger button — slots into the user
 * detail page's actions row alongside Ban.
 *
 * After a successful send, invalidates the notifications log query
 * so the admin can navigate to /admin/notifications and see their
 * row at the top of the table.
 */
export function SendPushSheet({
  userId,
  recipientName,
}: {
  userId: string;
  recipientName: string;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [deepLink, setDeepLink] = useState("");
  const qc = useQueryClient();

  const send = useMutation({
    mutationFn: () =>
      unwrap(
        api.post(`/admin/notifications/user/${userId}/push`, {
          title: title.trim(),
          body: body.trim(),
          ...(deepLink.trim() ? { deepLink: deepLink.trim() } : {}),
        }),
      ),
    onSuccess: () => {
      toast.success(`Push queued to ${recipientName}`);
      qc.invalidateQueries({ queryKey: QK.NOTIFICATIONS_LOG({}) });
      setOpen(false);
      setTitle("");
      setBody("");
      setDeepLink("");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Send failed"),
  });

  const canSubmit =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    title.length <= TITLE_MAX &&
    body.length <= BODY_MAX &&
    deepLink.length <= DEEP_LINK_MAX;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline">
          <Send className="h-4 w-4" /> Send push
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Send push to {recipientName}</SheetTitle>
          <SheetDescription>
            Title + body show up as the lock-screen notification. Optional
            deep link opens an in-app route on tap.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 px-4 py-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="push-title">Title</Label>
            <Input
              id="push-title"
              value={title}
              maxLength={TITLE_MAX}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="A short, attention-getting line"
              autoFocus
            />
            <p className="text-xs text-slate-500">
              {title.length}/{TITLE_MAX}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="push-body">Body</Label>
            <Textarea
              id="push-body"
              value={body}
              maxLength={BODY_MAX}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Up to 280 chars — keep it clear and actionable."
              rows={4}
            />
            <p className="text-xs text-slate-500">
              {body.length}/{BODY_MAX}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="push-deep-link">Deep link (optional)</Label>
            <Input
              id="push-deep-link"
              value={deepLink}
              maxLength={DEEP_LINK_MAX}
              onChange={(e) => setDeepLink(e.target.value)}
              placeholder="/settings/subscription"
            />
            <p className="text-xs text-slate-500">
              Mobile path or full deep link. Leave empty to open the home
              tab.
            </p>
          </div>
        </div>

        <SheetFooter className="flex flex-row justify-end gap-2 px-4 pb-4">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={send.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => send.mutate()}
            loading={send.isPending}
            disabled={!canSubmit || send.isPending}
          >
            <Send className="h-4 w-4" /> Send now
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
