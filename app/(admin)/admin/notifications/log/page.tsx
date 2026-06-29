"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/admin/layout/page-header";
import { formatDateTime } from "@/lib/utils";
import type {
  NotificationChannel,
  NotificationLogRow,
} from "@/types/api";

const PAGE_SIZE = 50;

const CHANNEL_TONE: Record<NotificationChannel, string> = {
  push: "border-blue-300 bg-blue-50 text-blue-700",
  sms: "border-emerald-300 bg-emerald-50 text-emerald-700",
  whatsapp: "border-emerald-300 bg-emerald-50 text-emerald-700",
  in_app: "border-slate-300 bg-slate-50 text-slate-700",
};

/**
 * Notification log — every push the platform has ever sent, until
 * the 90-day retention prune. Read-only audit trail used to answer
 * "did user X actually get our message?" without grepping logs.
 *
 * Filters:
 *   - Channel (push / email / in_app)
 *   - Type (the `data.type` discriminator — e.g. `winner`,
 *     `account_credited`, `admin_message`)
 *   - User id (paste a user UUID to see only their stream)
 */
export default function NotificationsLogPage() {
  const [channelFilter, setChannelFilter] = useState<
    NotificationChannel | "all"
  >("all");
  const [typeFilter, setTypeFilter] = useState("");
  const [userIdFilter, setUserIdFilter] = useState("");
  const [page, setPage] = useState(0);

  const filters = useMemo(
    () => ({
      channel: channelFilter === "all" ? undefined : channelFilter,
      type: typeFilter.trim() || undefined,
      userId: userIdFilter.trim() || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }),
    [channelFilter, typeFilter, userIdFilter, page],
  );

  const { data, isLoading } = useQuery({
    queryKey: QK.NOTIFICATIONS_LOG(filters),
    queryFn: () =>
      unwrap<{ items: NotificationLogRow[]; total: number }>(
        api.get("/admin/notifications", {
          params: {
            limit: filters.limit,
            offset: filters.offset,
            ...(filters.channel ? { channel: filters.channel } : {}),
            ...(filters.type ? { type: filters.type } : {}),
            ...(filters.userId ? { userId: filters.userId } : {}),
          },
        }),
      ),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Notification log"
        description="Every push, email and in-app notification the platform has sent. Rows older than 90 days are auto-pruned by NotificationRetentionJob."
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500">Channel</label>
          <Select
            value={channelFilter}
            onValueChange={(v) => {
              setChannelFilter(v as NotificationChannel | "all");
              setPage(0);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All channels</SelectItem>
              <SelectItem value="push">Push</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="in_app">In-app</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500">Type</label>
          <Input
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(0);
            }}
            placeholder="winner | account_credited"
            className="w-48"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500">User id</label>
          <Input
            value={userIdFilter}
            onChange={(e) => {
              setUserIdFilter(e.target.value);
              setPage(0);
            }}
            placeholder="UUID"
            className="w-64 font-mono text-xs"
          />
        </div>
        <div className="ml-auto text-sm text-slate-500">
          {isLoading ? "…" : `${total} entries`}
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Channel</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Body</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Sent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : items.map((row) => {
                  const dataType =
                    row.data && typeof row.data === "object"
                      ? typeof (row.data as Record<string, unknown>).type ===
                        "string"
                        ? ((row.data as Record<string, unknown>).type as string)
                        : null
                      : null;
                  const sentByAdmin =
                    row.data &&
                    typeof row.data === "object" &&
                    typeof (row.data as Record<string, unknown>)
                      .sentByAdminId === "string";
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs ${CHANNEL_TONE[row.channel]}`}
                        >
                          {row.channel}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        {dataType ?? "—"}
                        {sentByAdmin ? (
                          <span className="ml-1 text-[10px] text-slate-400">
                            (admin)
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-xs">
                        {row.user && row.userId ? (
                          <Link
                            href={`/admin/users/${row.userId}`}
                            className="text-slate-700 hover:underline"
                          >
                            {row.user.fullName ??
                              row.user.email ??
                              row.userId}
                          </Link>
                        ) : (
                          <span className="font-mono text-[11px] text-slate-500">
                            {row.userId
                              ? `${row.userId.slice(0, 8)}…`
                              : "—"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell
                        className="text-sm text-slate-900 max-w-xs truncate"
                        title={row.title}
                      >
                        {row.title}
                      </TableCell>
                      <TableCell
                        className="text-xs text-slate-500 max-w-md truncate"
                        title={row.body}
                      >
                        {row.body}
                      </TableCell>
                      <TableCell className="text-slate-500 text-xs">
                        {formatDateTime(row.createdAt)}
                      </TableCell>
                      <TableCell className="text-slate-500 text-xs">
                        {row.sentAt ? formatDateTime(row.sentAt) : "queued"}
                      </TableCell>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 0 || isLoading}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          Previous
        </Button>
        <div className="text-xs text-slate-500">
          Page {page + 1} / {pages}
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={page + 1 >= pages || isLoading}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
