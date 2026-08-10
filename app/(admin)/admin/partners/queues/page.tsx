"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { QK } from "@/lib/query-keys";
import {
  listAppeals,
  listFraudEvents,
  resolveAppeal,
  resolveFraudEvent,
} from "@/lib/partners/api";
import { PageHeader } from "@/components/admin/layout/page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";
import {
  APPEAL_STATUS_TONE,
  FRAUD_SEVERITY_TONE,
} from "@/components/admin/partners/status-badge";
import { ApproveOrHoldDialog } from "@/components/admin/partners/action-dialog";
import type { PartnerAppeal, PartnerFraudEvent } from "@/types/api";

/**
 * Cross-partner triage view. Two tabs:
 *   - Appeals — every OPEN appeal from any partner, resolve (uphold /
 *     deny) with a note.
 *   - Fraud events — every unresolved fraud detection, mark resolved
 *     (audit-only; doesn't change partner status).
 */
export default function PartnerQueuesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Partner queues"
        description="Open appeals and unresolved fraud events across every partner."
      />
      <Tabs defaultValue="appeals">
        <TabsList>
          <TabsTrigger value="appeals">Appeals</TabsTrigger>
          <TabsTrigger value="fraud">Fraud events</TabsTrigger>
        </TabsList>
        <TabsContent value="appeals">
          <AppealsQueue />
        </TabsContent>
        <TabsContent value="fraud">
          <FraudQueue />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// -------------------------- Appeals -----------------------------

function AppealsQueue() {
  const filters = { status: "open" as const, limit: 100 };
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: QK.PARTNER_APPEALS(filters),
    queryFn: () => listAppeals(filters),
  });
  const [pending, setPending] = useState<{
    appeal: PartnerAppeal;
    decision: "upheld" | "denied";
  } | null>(null);

  const resolveMut = useMutation({
    mutationFn: (args: {
      id: string;
      decision: "upheld" | "denied";
      note?: string;
    }) => resolveAppeal(args.id, args.decision, args.note),
    onSuccess: () => {
      toast.success("Appeal resolved");
      setPending(null);
      void qc.invalidateQueries({ queryKey: QK.PARTNER_APPEALS(filters) });
    },
    onError: (err: { message?: string }) =>
      toast.error(err.message ?? "Failed to resolve"),
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if ((data?.items.length ?? 0) === 0) {
    return (
      <Card className="p-6 text-sm text-slate-500">
        No open appeals. All caught up.
      </Card>
    );
  }
  return (
    <>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Partner</TableHead>
              <TableHead>#</TableHead>
              <TableHead>Opened</TableHead>
              <TableHead>Body</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Resolve</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data!.items.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <Link
                    href={`/admin/partners/${a.partnerId}`}
                    className="text-xs font-mono text-orange-700 hover:text-orange-900"
                  >
                    {a.partnerId.slice(0, 8)}
                  </Link>
                </TableCell>
                <TableCell className="font-mono text-slate-900">
                  #{a.appealNumber}
                </TableCell>
                <TableCell className="text-xs text-slate-500">
                  {formatDateTime(a.openedAt)}
                </TableCell>
                <TableCell className="text-xs text-slate-700 whitespace-pre-wrap max-w-lg">
                  {a.body}
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${APPEAL_STATUS_TONE[a.status]}`}
                  >
                    {a.status}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setPending({ appeal: a, decision: "upheld" })
                      }
                      className="text-xs font-medium text-emerald-700 hover:text-emerald-900"
                    >
                      Uphold
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPending({ appeal: a, decision: "denied" })
                      }
                      className="text-xs font-medium text-rose-700 hover:text-rose-900"
                    >
                      Deny
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <ApproveOrHoldDialog
        open={pending !== null}
        title={
          pending?.decision === "upheld"
            ? `Uphold appeal #${pending.appeal.appealNumber}`
            : `Deny appeal #${pending?.appeal.appealNumber ?? ""}`
        }
        description={
          pending?.decision === "upheld"
            ? "The partner is reinstated to ACTIVE and their fraud counter resets to zero. Note is optional but strongly encouraged — it lands in the resolution email."
            : "The appeal is closed as denied. Third denial auto-bans the partner and forfeits outstanding earnings. Note is optional but strongly encouraged."
        }
        confirmLabel={
          pending?.decision === "upheld" ? "Uphold" : "Deny appeal"
        }
        destructive={pending?.decision === "denied"}
        onCancel={() => setPending(null)}
        onConfirm={(note) =>
          pending &&
          resolveMut.mutate({
            id: pending.appeal.id,
            decision: pending.decision,
            note,
          })
        }
        isPending={resolveMut.isPending}
        minLength={0}
      />
    </>
  );
}

// -------------------------- Fraud events ------------------------

function FraudQueue() {
  const filters = { resolved: false, limit: 100 };
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: QK.PARTNER_FRAUD_EVENTS(filters),
    queryFn: () => listFraudEvents(filters),
  });
  const resolveMut = useMutation({
    mutationFn: (row: PartnerFraudEvent) => resolveFraudEvent(row.id),
    onSuccess: () => {
      toast.success("Marked resolved");
      void qc.invalidateQueries({ queryKey: QK.PARTNER_FRAUD_EVENTS(filters) });
    },
    onError: (err: { message?: string }) =>
      toast.error(err.message ?? "Failed"),
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if ((data?.items.length ?? 0) === 0) {
    return (
      <Card className="p-6 text-sm text-slate-500">
        No unresolved fraud events.
      </Card>
    );
  }
  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Partner</TableHead>
            <TableHead>When</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data!.items.map((f) => (
            <TableRow key={f.id}>
              <TableCell>
                <Link
                  href={`/admin/partners/${f.partnerId}`}
                  className="text-xs font-mono text-orange-700 hover:text-orange-900"
                >
                  {f.partnerId.slice(0, 8)}
                </Link>
              </TableCell>
              <TableCell className="text-xs text-slate-500">
                {formatDateTime(f.detectedAt)}
              </TableCell>
              <TableCell className="text-slate-900">{f.reason}</TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${FRAUD_SEVERITY_TONE[f.severity]}`}
                >
                  {f.severity}
                </span>
              </TableCell>
              <TableCell className="text-xs font-mono text-slate-500">
                {f.subjectRef ?? "—"}
              </TableCell>
              <TableCell className="text-right">
                <button
                  type="button"
                  onClick={() => resolveMut.mutate(f)}
                  disabled={resolveMut.isPending}
                  className="text-xs font-medium text-slate-700 hover:text-slate-900 disabled:opacity-50"
                >
                  Mark resolved
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
