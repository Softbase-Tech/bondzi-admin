"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Send } from "lucide-react";
import toast from "react-hot-toast";
import { formatDistanceToNow, parseISO } from "date-fns";
import { QK } from "@/lib/query-keys";
import {
  closeTicket,
  getTicket,
  replyToTicket,
} from "@/lib/support/api";
import { PageHeader } from "@/components/admin/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/utils";

/**
 * Ticket detail — full thread + reply composer + close action.
 *
 * The composer is always visible when the ticket is open. Closing
 * requires an explicit confirmation with an optional reason that
 * ships alongside the close-notification to the student.
 */
export default function SupportTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: QK.SUPPORT_TICKET_DETAIL(id),
    queryFn: () => getTicket(id),
    refetchInterval: 20_000,
  });

  const [reply, setReply] = useState("");
  const [closing, setClosing] = useState(false);
  const [closeReason, setCloseReason] = useState("");

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: QK.SUPPORT_TICKET_DETAIL(id) });
    void qc.invalidateQueries({ queryKey: ["support", "tickets"] });
  };

  const replyMut = useMutation({
    mutationFn: () => replyToTicket(id, reply.trim()),
    onSuccess: () => {
      setReply("");
      toast.success("Reply sent");
      invalidate();
    },
    onError: (err: { message?: string }) =>
      toast.error(err.message ?? "Reply failed"),
  });

  const closeMut = useMutation({
    mutationFn: () => closeTicket(id, closeReason.trim() || undefined),
    onSuccess: () => {
      setClosing(false);
      setCloseReason("");
      toast.success("Ticket closed");
      invalidate();
    },
    onError: (err: { message?: string }) =>
      toast.error(err.message ?? "Close failed"),
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/support"
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft size={12} /> All tickets
        </Link>
      </div>
      <PageHeader
        title={data.subject}
        description={`${data.ticketNumber} · ${prettyCategory(data.category)} · opened ${formatDistanceToNow(parseISO(data.createdAt), { addSuffix: true })}${data.relatedTicketNumber ? ` · continues ${data.relatedTicketNumber}` : ""}`}
        actions={
          data.status === "open" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setClosing(true)}
            >
              <CheckCircle2 size={14} className="mr-1" />
              Close ticket
            </Button>
          ) : (
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500">
              Closed{" "}
              {data.closedAt
                ? formatDistanceToNow(parseISO(data.closedAt), {
                    addSuffix: true,
                  })
                : ""}
            </span>
          )
        }
      />

      {/* User card — who is this ticket from */}
      {data.user ? (
        <Card className="p-4 flex items-center gap-4">
          <div className="flex-1">
            <div className="text-sm font-medium text-slate-900">
              {data.user.fullName}
            </div>
            <div className="text-xs text-slate-500">
              {data.user.email ?? "no email"}
              {data.user.username ? ` · @${data.user.username}` : ""}
            </div>
          </div>
        </Card>
      ) : null}

      {/* Context — for wrong_question, payment, etc. */}
      {data.context && Object.keys(data.context).length > 0 ? (
        <Card className="p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-2">
            Context
          </div>
          <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono">
            {JSON.stringify(data.context, null, 2)}
          </pre>
        </Card>
      ) : null}

      {/* Thread */}
      <div className="space-y-3">
        {data.messages.map((m) => {
          if (m.senderRole === "system") {
            return (
              <div key={m.id} className="text-center">
                <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
                  {m.body}
                </span>
                <div className="text-[11px] text-slate-400 mt-1">
                  {formatDateTime(m.createdAt)}
                </div>
              </div>
            );
          }
          const isAdmin = m.senderRole === "admin";
          return (
            <div
              key={m.id}
              className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-2xl rounded-2xl px-4 py-3 ${isAdmin ? "bg-orange-50 border border-orange-200" : "bg-slate-100"}`}
              >
                <div
                  className={`text-xs font-medium mb-1 ${isAdmin ? "text-orange-700" : "text-slate-700"}`}
                >
                  {isAdmin ? m.senderName ?? "Ops" : "Student"}
                </div>
                <div className="text-sm text-slate-900 whitespace-pre-wrap">
                  {m.body}
                </div>
                {m.attachments.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {m.attachments.map((a) => {
                      const href = absoluteUrl(a.url);
                      if (a.mime.startsWith("image/")) {
                        return (
                          <a
                            key={a.url}
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className="block"
                            title={a.originalFilename ?? "attachment"}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={href}
                              alt={a.originalFilename ?? "attachment"}
                              className="h-32 w-32 rounded-lg object-cover border border-white/70 hover:opacity-90"
                            />
                          </a>
                        );
                      }
                      return (
                        <a
                          key={a.url}
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center rounded-md bg-white/70 px-2 py-1 text-xs text-slate-700 hover:bg-white"
                        >
                          📎 {a.originalFilename ?? "attachment"}
                        </a>
                      );
                    })}
                  </div>
                ) : null}
                <div className="text-[11px] text-slate-500 mt-2">
                  {formatDateTime(m.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reply composer or close panel */}
      {data.status === "open" && !closing ? (
        <Card className="p-4 space-y-3">
          <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">
            Reply to the student
          </label>
          <textarea
            className="w-full rounded-md border border-slate-200 p-3 text-sm min-h-32"
            placeholder="Write your reply…"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              onClick={() => replyMut.mutate()}
              disabled={replyMut.isPending || reply.trim().length === 0}
            >
              <Send size={14} className="mr-1" />
              {replyMut.isPending ? "Sending…" : "Send reply"}
            </Button>
          </div>
        </Card>
      ) : null}

      {closing ? (
        <Card className="p-4 space-y-3 border-orange-200">
          <div className="text-sm font-medium text-slate-900">
            Close this ticket?
          </div>
          <div className="text-xs text-slate-500">
            The student is notified via push + in-app. If you add a reason
            here, it&apos;s included in the notification.
          </div>
          <textarea
            className="w-full rounded-md border border-slate-200 p-3 text-sm min-h-20"
            placeholder="Optional reason for closing…"
            value={closeReason}
            onChange={(e) => setCloseReason(e.target.value)}
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setClosing(false);
                setCloseReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => closeMut.mutate()}
              disabled={closeMut.isPending}
            >
              <CheckCircle2 size={14} className="mr-1" />
              {closeMut.isPending ? "Closing…" : "Close ticket"}
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function absoluteUrl(url: string): string {
  if (url.startsWith("http")) return url;
  const base = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
  return `${base}${url}`;
}

function prettyCategory(c: string): string {
  switch (c) {
    case "feedback":
      return "Feedback";
    case "wrong_question":
      return "Wrong question";
    case "payment":
      return "Payment";
    case "general":
      return "General";
    default:
      return c;
  }
}
