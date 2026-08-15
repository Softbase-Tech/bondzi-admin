"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow, parseISO } from "date-fns";
import { QK } from "@/lib/query-keys";
import { listTickets, type SupportCategory, type SupportStatus } from "@/lib/support/api";
import { PageHeader } from "@/components/admin/layout/page-header";
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

const PAGE_SIZE = 25;

/**
 * Support queue — the top-level view for ops.
 *
 * Backend orders by `open first, then oldest last_reply_at` so the
 * stalest awaiting-reply row bubbles to the top. We keep that order —
 * clicking a column header would be nice, but the API doesn't sort
 * yet and premature client-side sort would silently drop long-tail
 * rows when the queue paginates past a page.
 */
export default function SupportQueuePage() {
  const [status, setStatus] = useState<SupportStatus | "all">("open");
  const [category, setCategory] = useState<SupportCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filters = useMemo(
    () => ({
      status: status === "all" ? undefined : status,
      category: category === "all" ? undefined : category,
      search: search.trim() || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [status, category, search, page],
  );

  const { data, isLoading } = useQuery({
    queryKey: QK.SUPPORT_TICKETS(filters),
    queryFn: () => listTickets(filters),
    refetchInterval: 30_000, // keep the queue moderately live for ops
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support"
        description="Every ticket from the app. Open ones first, oldest awaiting reply at the top."
      />

      <Card className="p-4 flex flex-wrap gap-3 items-center">
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as SupportStatus | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="all">All statuses</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={category}
          onValueChange={(v) => {
            setCategory(v as SupportCategory | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            <SelectItem value="feedback">Feedback</SelectItem>
            <SelectItem value="wrong_question">Wrong question</SelectItem>
            <SelectItem value="payment">Payment</SelectItem>
            <SelectItem value="general">General</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Search subject / ticket number / user…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="flex-1 min-w-56"
        />
      </Card>

      {isLoading ? (
        <Card className="p-4 space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </Card>
      ) : (data?.items.length ?? 0) === 0 ? (
        <Card className="p-8 text-center text-sm text-slate-500">
          Nothing here. Adjust filters or wait for the next ticket.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last reply</TableHead>
                <TableHead>Msgs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data!.items.map((t) => (
                <TableRow
                  key={t.id}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <TableCell>
                    <Link
                      href={`/admin/support/${t.id}`}
                      className="block"
                    >
                      <div className="font-medium text-slate-900">
                        {t.subject}
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        {t.ticketNumber}
                      </div>
                      {t.preview ? (
                        <div className="text-xs text-slate-500 mt-1 line-clamp-1">
                          {t.preview}
                        </div>
                      ) : null}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-slate-900">
                      {t.user?.fullName ?? "—"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {t.user?.email ?? "no email"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700">
                      {prettyCategory(t.category)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {t.status === "open" ? (
                      t.lastReplyBy === "user" ? (
                        <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs text-orange-700">
                          Awaiting reply
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                          Open
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-500">
                        Closed
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {formatDistanceToNow(parseISO(t.lastReplyAt), {
                      addSuffix: true,
                    })}
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {t.messageCount}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {data && data.total > PAGE_SIZE ? (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, data.total)} of {data.total}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-md border border-slate-200 px-3 py-1 disabled:opacity-50"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={page * PAGE_SIZE >= data.total}
              className="rounded-md border border-slate-200 px-3 py-1 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function prettyCategory(c: SupportCategory): string {
  switch (c) {
    case "feedback":
      return "Feedback";
    case "wrong_question":
      return "Wrong question";
    case "payment":
      return "Payment";
    case "general":
      return "General";
  }
}
