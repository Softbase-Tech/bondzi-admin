"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Send, User as UserIcon, X } from "lucide-react";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import {
  notificationSchema,
  type NotificationFormData,
} from "@/lib/validators/notification";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/admin/layout/page-header";
import type { Paginated, User } from "@/types/api";

export default function NotificationsPage() {
  const form = useForm<NotificationFormData>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      title: "",
      body: "",
      channels: ["in_app"],
      segment: "all",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: NotificationFormData) =>
      api.post("/admin/notifications", data),
    onSuccess: () => {
      toast.success("Notification queued");
      form.reset();
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const channels = form.watch("channels");

  function toggleChannel(ch: "push" | "sms" | "in_app") {
    const set = new Set(channels);
    set.has(ch) ? set.delete(ch) : set.add(ch);
    form.setValue("channels", [...set] as NotificationFormData["channels"], {
      shouldValidate: true,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Notifications"
        description="Send a targeted push/SMS/in-app message. Dispatched via BullMQ."
      />

      <SendToOneUserCard />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Broadcast</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit((d) => mutation.mutate(d))}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title">Title</Label>
              <Input id="title" {...form.register("title")} />
              {form.formState.errors.title && (
                <p className="text-xs text-rose-600">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="body">Body</Label>
              <Textarea id="body" rows={4} {...form.register("body")} />
              {form.formState.errors.body && (
                <p className="text-xs text-rose-600">
                  {form.formState.errors.body.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Channels</Label>
              <div className="flex gap-4">
                {(["push", "sms", "in_app"] as const).map((ch) => (
                  <label key={ch} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={channels.includes(ch)}
                      onCheckedChange={() => toggleChannel(ch)}
                    />
                    <span className="capitalize">{ch.replace("_", " ")}</span>
                  </label>
                ))}
              </div>
              {form.formState.errors.channels && (
                <p className="text-xs text-rose-600">
                  {form.formState.errors.channels.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Segment</Label>
              <Select
                value={form.watch("segment")}
                onValueChange={(v: NotificationFormData["segment"]) =>
                  form.setValue("segment", v)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  <SelectItem value="free">Free tier</SelectItem>
                  <SelectItem value="paid">Paid tier</SelectItem>
                  <SelectItem value="expiring_soon">
                    Expiring this week
                  </SelectItem>
                  <SelectItem value="custom">Custom (advanced)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end">
              <Button type="submit" loading={mutation.isPending}>
                <Send className="h-4 w-4" /> Send
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

const TITLE_MAX = 80;
const BODY_MAX = 280;
const DEEP_LINK_MAX = 200;

/**
 * Inline "send a push to one user" card. Hits the same endpoint the
 * SendPushSheet on the user detail page uses
 * (`POST /admin/notifications/user/:userId/push`) — surfaced here so the
 * operator doesn't have to deep-link through a user profile when they
 * already know who they're paging. Search is server-side against
 * `GET /admin/users?search=` (matches fullName / email / username /
 * phone, case-insensitive).
 */
function SendToOneUserCard() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<User | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [deepLink, setDeepLink] = useState("");
  const qc = useQueryClient();

  // Debounce the search input so we're not firing a request on every
  // keystroke. 250ms feels responsive without hammering the backend.
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  const searchEnabled = debouncedQuery.length >= 2 && !selected;
  const { data, isFetching } = useQuery({
    queryKey: ["admin", "users", "search", debouncedQuery],
    queryFn: () =>
      unwrap<Paginated<User>>(
        api.get("/admin/users", {
          params: { search: debouncedQuery, limit: 8, page: 1 },
        }),
      ),
    enabled: searchEnabled,
  });

  const send = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("Pick a user first");
      return unwrap(
        api.post(`/admin/notifications/user/${selected.id}/push`, {
          title: title.trim(),
          body: body.trim(),
          ...(deepLink.trim() ? { deepLink: deepLink.trim() } : {}),
        }),
      );
    },
    onSuccess: () => {
      toast.success(
        `Push queued to ${selected?.fullName ?? selected?.email ?? "user"}`,
      );
      qc.invalidateQueries({ queryKey: QK.NOTIFICATIONS_LOG({}) });
      setTitle("");
      setBody("");
      setDeepLink("");
      setSelected(null);
      setQuery("");
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "Send failed"),
  });

  const canSubmit = useMemo(
    () =>
      Boolean(selected) &&
      title.trim().length > 0 &&
      body.trim().length > 0 &&
      title.length <= TITLE_MAX &&
      body.length <= BODY_MAX &&
      deepLink.length <= DEEP_LINK_MAX,
    [selected, title, body, deepLink],
  );

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserIcon className="h-4 w-4" /> Send to a specific user
        </CardTitle>
        <p className="text-xs text-slate-500">
          Sends a push to one account. Routes through the same path as the
          &ldquo;Send push&rdquo; button on the user detail page and appears
          in the{" "}
          <Link
            href="/admin/notifications/log"
            className="text-primary hover:underline"
          >
            notification log
          </Link>{" "}
          stamped <code className="font-mono text-[11px]">(admin)</code>.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="user-search">Recipient</Label>
          {selected ? (
            <div className="flex items-center gap-2 rounded-md border bg-slate-50 px-3 py-2">
              <div className="flex flex-col">
                <span className="text-sm font-medium">{selected.fullName}</span>
                <span className="text-xs text-slate-500">
                  {selected.username ? `@${selected.username} · ` : ""}
                  {selected.email ?? selected.phone ?? selected.id}
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="ml-auto"
                onClick={() => {
                  setSelected(null);
                  setQuery("");
                }}
              >
                <X className="h-3.5 w-3.5" /> Change
              </Button>
            </div>
          ) : (
            <>
              <Input
                id="user-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, username, email, or phone…"
              />
              {searchEnabled && (
                <div className="mt-1 max-h-64 overflow-auto rounded-md border">
                  {isFetching && (
                    <div className="px-3 py-2 text-xs text-slate-500">
                      Searching…
                    </div>
                  )}
                  {!isFetching && (data?.items.length ?? 0) === 0 && (
                    <div className="px-3 py-2 text-xs text-slate-500">
                      No users matched.
                    </div>
                  )}
                  {data?.items.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setSelected(u)}
                      className="flex w-full flex-col items-start gap-0.5 border-b px-3 py-2 text-left last:border-b-0 hover:bg-slate-50"
                    >
                      <span className="text-sm font-medium">
                        {u.fullName}
                      </span>
                      <span className="text-xs text-slate-500">
                        {u.username ? `@${u.username} · ` : ""}
                        {u.email ?? u.phone ?? u.id.slice(0, 8)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {!searchEnabled && (
                <p className="text-xs text-slate-500">
                  Type 2+ characters to search.
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="single-title">Title</Label>
          <Input
            id="single-title"
            value={title}
            maxLength={TITLE_MAX}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="A short, attention-getting line"
          />
          <p className="text-xs text-slate-500">
            {title.length}/{TITLE_MAX}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="single-body">Body</Label>
          <Textarea
            id="single-body"
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
          <Label htmlFor="single-deep-link">Deep link (optional)</Label>
          <Input
            id="single-deep-link"
            value={deepLink}
            maxLength={DEEP_LINK_MAX}
            onChange={(e) => setDeepLink(e.target.value)}
            placeholder="/settings/subscription"
          />
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => send.mutate()}
            loading={send.isPending}
            disabled={!canSubmit || send.isPending}
          >
            <Send className="h-4 w-4" /> Send push
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
