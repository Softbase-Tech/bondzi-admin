"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  Coins,
  Download,
  PauseCircle,
  ReceiptText,
  Users,
} from "lucide-react";
import { QK } from "@/lib/query-keys";
import {
  approvePartner,
  banPartner,
  createPayoutForPartner,
  downloadPayoutInvoice,
  getPartnerDetail,
  listCommissions,
  listPayouts,
  markPayoutFailed,
  markPayoutPaid,
  previewPayoutForPartner,
  resolveFlaggedCommission,
  suspendPartner,
} from "@/lib/partners/api";
import { PageHeader } from "@/components/admin/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { formatDateTime, formatDate } from "@/lib/utils";
import {
  APPEAL_STATUS_TONE,
  COMMISSION_STATUS_TONE,
  PAYOUT_STATUS_TONE,
  STATUS_TONE,
  statusLabel,
} from "@/components/admin/partners/status-badge";
import type {
  Partner,
  PartnerCommission,
  PartnerPayout,
} from "@/types/api";
import { ApproveOrHoldDialog } from "@/components/admin/partners/action-dialog";

export default function PartnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: QK.PARTNER_DETAIL(id),
    queryFn: () => getPartnerDetail(id),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: QK.PARTNER_DETAIL(id) });
  };

  const approveMut = useMutation({
    mutationFn: () => approvePartner(id),
    onSuccess: () => {
      toast.success("Partner approved");
      invalidate();
    },
    onError: (err: { message?: string }) =>
      toast.error(err.message ?? "Failed to approve"),
  });

  const [pendingAction, setPendingAction] = useState<
    "suspend" | "ban" | null
  >(null);

  const suspendMut = useMutation({
    mutationFn: (reason: string) => suspendPartner(id, reason),
    onSuccess: () => {
      toast.success("Partner suspended");
      setPendingAction(null);
      invalidate();
    },
    onError: (err: { message?: string }) =>
      toast.error(err.message ?? "Failed to suspend"),
  });

  const banMut = useMutation({
    mutationFn: (reason: string) => banPartner(id, reason),
    onSuccess: () => {
      toast.success("Partner banned");
      setPendingAction(null);
      invalidate();
    },
    onError: (err: { message?: string }) =>
      toast.error(err.message ?? "Failed to ban"),
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

  const partner = data.partner;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/partners"
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft size={12} /> All partners
        </Link>
      </div>
      <PageHeader
        title={partner.fullName}
        description={`${partner.email} · ${partner.phone}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {partner.status === "pending" ? (
              <Button
                size="sm"
                onClick={() => approveMut.mutate()}
                disabled={approveMut.isPending}
              >
                <CheckCircle2 size={14} className="mr-1" />
                Approve
              </Button>
            ) : null}
            {partner.status === "active" || partner.status === "pending" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPendingAction("suspend")}
              >
                <PauseCircle size={14} className="mr-1" />
                Suspend
              </Button>
            ) : null}
            {partner.status !== "banned" ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setPendingAction("ban")}
              >
                <Ban size={14} className="mr-1" />
                Ban
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatTile
          Icon={Users}
          label="Attributed users"
          value={String(data.attributionsCount)}
        />
        <StatTile
          Icon={Coins}
          label="Ready to pay out"
          value={`GHS ${data.approvedUnpaidGhs}`}
        />
        <StatTile
          Icon={ReceiptText}
          label="Paid to date"
          value={`GHS ${data.totalPaidGhs}`}
          hint={`${data.paidCommissionCount} commissions`}
        />
        <StatTile
          Icon={PauseCircle}
          label="Fraud flags"
          value={String(partner.fraudFlagCount)}
          tone={partner.fraudFlagCount > 0 ? "warn" : "default"}
        />
      </div>

      <ProfileCard partner={partner} defaultCodeText={data.defaultCode?.code} />

      <Tabs defaultValue="commissions">
        <TabsList>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
          <TabsTrigger value="appeals">Appeals</TabsTrigger>
        </TabsList>
        <TabsContent value="commissions">
          <CommissionsTab partnerId={id} />
        </TabsContent>
        <TabsContent value="payouts">
          <PayoutsTab partnerId={id} />
        </TabsContent>
        <TabsContent value="appeals">
          <AppealsTab partnerId={id} />
        </TabsContent>
      </Tabs>

      <ApproveOrHoldDialog
        open={pendingAction === "suspend"}
        title="Suspend partner"
        description="Suspension pauses payouts. The partner can open an appeal."
        confirmLabel="Suspend"
        onCancel={() => setPendingAction(null)}
        onConfirm={(reason) => suspendMut.mutate(reason)}
        isPending={suspendMut.isPending}
      />
      <ApproveOrHoldDialog
        open={pendingAction === "ban"}
        title="Ban partner"
        description="Bans are permanent and forfeit outstanding commissions. Outstanding earnings cannot be recovered."
        confirmLabel="Ban partner"
        destructive
        onCancel={() => setPendingAction(null)}
        onConfirm={(reason) => banMut.mutate(reason)}
        isPending={banMut.isPending}
      />
    </div>
  );
}

function StatTile({
  Icon,
  label,
  value,
  hint,
  tone,
}: {
  Icon: typeof Coins;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warn";
}) {
  return (
    <Card
      className={`p-4 ${
        tone === "warn"
          ? "border-orange-200 bg-orange-50/40"
          : ""
      }`}
    >
      <div className="flex items-center gap-2 text-slate-500">
        <Icon size={14} />
        <span className="text-[11px] font-medium uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </Card>
  );
}

function ProfileCard({
  partner,
  defaultCodeText,
}: {
  partner: Partner;
  defaultCodeText?: string;
}) {
  return (
    <Card className="p-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <Field label="Status">
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${STATUS_TONE[partner.status]}`}
          >
            {statusLabel(partner.status)}
          </span>
        </Field>
        <Field label="Default code">
          <span className="font-mono text-sm text-slate-900">
            {defaultCodeText ?? "—"}
          </span>
        </Field>
        <Field label="MoMo">
          {partner.momoProvider.toUpperCase()} · {partner.momoNumber}{" "}
          <span className="text-slate-500">({partner.momoAccountName})</span>
        </Field>
        <Field label="Country">{partner.countryCode}</Field>
        <Field label="Approved at">
          {partner.approvedAt ? formatDateTime(partner.approvedAt) : "—"}
        </Field>
        <Field label="Suspended / Banned">
          {partner.bannedAt
            ? `Banned ${formatDateTime(partner.bannedAt)}`
            : partner.suspendedAt
              ? `Suspended ${formatDateTime(partner.suspendedAt)}`
              : "—"}
        </Field>
      </div>
    </Card>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-slate-900">{children}</p>
    </div>
  );
}

// ==========================================================================
// Commissions tab
// ==========================================================================

function CommissionsTab({ partnerId }: { partnerId: string }) {
  const qc = useQueryClient();
  const filters = { partnerId, limit: 100 };
  const { data, isLoading } = useQuery({
    queryKey: QK.PARTNER_COMMISSIONS(filters),
    queryFn: () => listCommissions(filters),
  });

  const resolveMut = useMutation({
    mutationFn: ({
      id,
      decision,
    }: {
      id: string;
      decision: "approve" | "clawback";
    }) => resolveFlaggedCommission(id, decision),
    onSuccess: () => {
      toast.success("Commission resolved");
      void qc.invalidateQueries({
        queryKey: QK.PARTNER_COMMISSIONS(filters),
      });
      void qc.invalidateQueries({
        queryKey: QK.PARTNER_DETAIL(partnerId),
      });
    },
    onError: (err: { message?: string }) =>
      toast.error(err.message ?? "Failed to resolve"),
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if ((data?.items.length ?? 0) === 0) {
    return (
      <Card className="p-6 text-sm text-slate-500">
        No commissions yet.
      </Card>
    );
  }
  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Earned</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ref</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data!.items.map((c: PartnerCommission) => (
            <TableRow key={c.id}>
              <TableCell className="text-slate-500 text-xs">
                {formatDateTime(c.earnedAt)}
              </TableCell>
              <TableCell className="text-slate-900">
                {prettyType(c.type)}
              </TableCell>
              <TableCell className="text-right font-mono text-slate-900">
                GHS {c.amountGhs}
              </TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${COMMISSION_STATUS_TONE[c.status]}`}
                >
                  {c.status.replace("_", " ")}
                </span>
              </TableCell>
              <TableCell className="text-xs text-slate-500 font-mono">
                {c.subscriptionId
                  ? `sub ${c.subscriptionId.slice(0, 8)}`
                  : c.userId
                    ? `user ${c.userId.slice(0, 8)}`
                    : c.batchUserIds?.length
                      ? `batch (${c.batchUserIds.length})`
                      : "—"}
              </TableCell>
              <TableCell className="text-right">
                {c.status === "flagged" ? (
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        resolveMut.mutate({ id: c.id, decision: "approve" })
                      }
                      disabled={resolveMut.isPending}
                      className="text-xs font-medium text-emerald-700 hover:text-emerald-900 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        resolveMut.mutate({ id: c.id, decision: "clawback" })
                      }
                      disabled={resolveMut.isPending}
                      className="text-xs font-medium text-rose-700 hover:text-rose-900 disabled:opacity-50"
                    >
                      Claw back
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function prettyType(t: PartnerCommission["type"]): string {
  switch (t) {
    case "plus_subscription":
      return "Plus subscription";
    case "signup_batch":
      return "Signup batch";
    case "answers_bonus":
      return "Answers bonus";
    case "plus_subscription_clawback":
      return "Clawback (offset)";
  }
}

// ==========================================================================
// Payouts tab
// ==========================================================================

function PayoutsTab({ partnerId }: { partnerId: string }) {
  const qc = useQueryClient();
  const previewQ = useQuery({
    queryKey: QK.PARTNER_PAYOUT_PREVIEW(partnerId),
    queryFn: () => previewPayoutForPartner(partnerId),
  });
  const payoutsQ = useQuery({
    queryKey: QK.PARTNER_PAYOUTS({ partnerId, limit: 100 }),
    queryFn: () => listPayouts({ partnerId, limit: 100 }),
  });

  const createMut = useMutation({
    mutationFn: () => createPayoutForPartner(partnerId),
    onSuccess: () => {
      toast.success("Payout created");
      void qc.invalidateQueries({
        queryKey: QK.PARTNER_PAYOUT_PREVIEW(partnerId),
      });
      void qc.invalidateQueries({
        queryKey: QK.PARTNER_PAYOUTS({ partnerId, limit: 100 }),
      });
    },
    onError: (err: { message?: string }) =>
      toast.error(err.message ?? "Failed to create payout"),
  });

  return (
    <div className="space-y-4">
      <Card className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Ready to pay out
          </p>
          <p className="text-2xl font-semibold text-slate-900">
            GHS {previewQ.data?.totalGhs ?? "0.00"}
          </p>
          <p className="text-xs text-slate-500">
            {previewQ.data?.commissionCount ?? 0} approved commissions
          </p>
        </div>
        <Button
          onClick={() => createMut.mutate()}
          disabled={
            !previewQ.data ||
            previewQ.data.commissionCount === 0 ||
            createMut.isPending
          }
        >
          {createMut.isPending ? "Creating…" : "Create weekly payout"}
        </Button>
      </Card>

      {payoutsQ.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (payoutsQ.data?.items.length ?? 0) === 0 ? (
        <Card className="p-6 text-sm text-slate-500">
          No payouts recorded yet.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Week of</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>MoMo ref</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payoutsQ.data!.items.map((p) => (
                <PayoutRow key={p.id} payout={p} partnerId={partnerId} />
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function PayoutRow({
  payout,
  partnerId,
}: {
  payout: PartnerPayout;
  partnerId: string;
}) {
  const qc = useQueryClient();
  const [markingPaid, setMarkingPaid] = useState(false);
  const [ref, setRef] = useState("");

  const paidMut = useMutation({
    mutationFn: () => markPayoutPaid(payout.id, ref.trim()),
    onSuccess: () => {
      toast.success("Payout marked paid");
      setMarkingPaid(false);
      setRef("");
      void qc.invalidateQueries({
        queryKey: QK.PARTNER_PAYOUTS({ partnerId, limit: 100 }),
      });
      void qc.invalidateQueries({
        queryKey: QK.PARTNER_DETAIL(partnerId),
      });
    },
    onError: (err: { message?: string }) =>
      toast.error(err.message ?? "Failed to mark paid"),
  });

  const failMut = useMutation({
    mutationFn: (reason: string) => markPayoutFailed(payout.id, reason),
    onSuccess: () => {
      toast.success("Payout marked failed");
      void qc.invalidateQueries({
        queryKey: QK.PARTNER_PAYOUTS({ partnerId, limit: 100 }),
      });
      void qc.invalidateQueries({
        queryKey: QK.PARTNER_PAYOUT_PREVIEW(partnerId),
      });
    },
    onError: (err: { message?: string }) =>
      toast.error(err.message ?? "Failed to mark failed"),
  });

  return (
    <TableRow>
      <TableCell className="font-mono text-xs">
        {payout.invoiceNumber}
      </TableCell>
      <TableCell className="text-slate-500">
        {formatDate(payout.weekOf)}
      </TableCell>
      <TableCell className="text-right font-mono text-slate-900">
        GHS {payout.amountGhs}
      </TableCell>
      <TableCell>
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${PAYOUT_STATUS_TONE[payout.status]}`}
        >
          {payout.status}
        </span>
      </TableCell>
      <TableCell className="text-slate-500 text-xs">
        {payout.momoReference ?? "—"}
      </TableCell>
      <TableCell className="text-right">
        {payout.status === "pending" ? (
          markingPaid ? (
            <div className="flex items-center gap-2 justify-end">
              <input
                type="text"
                placeholder="MoMo ref"
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                className="rounded-md border border-slate-200 px-2 py-1 text-xs w-32"
              />
              <button
                type="button"
                onClick={() => paidMut.mutate()}
                disabled={paidMut.isPending || !ref.trim()}
                className="text-xs font-medium text-emerald-700 disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setMarkingPaid(false)}
                className="text-xs text-slate-500"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={() => setMarkingPaid(true)}
                className="text-xs font-medium text-emerald-700 hover:text-emerald-900"
              >
                Mark paid
              </button>
              <button
                type="button"
                onClick={() => {
                  const reason = prompt("Reason for failure?");
                  if (reason) failMut.mutate(reason);
                }}
                className="text-xs font-medium text-rose-700 hover:text-rose-900"
              >
                Mark failed
              </button>
            </div>
          )
        ) : payout.status === "paid" ? (
          <button
            type="button"
            onClick={() => {
              void downloadPayoutInvoice(payout.id).catch((err: {
                message?: string;
              }) => toast.error(err.message ?? "Download failed"));
            }}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-900"
          >
            <Download size={12} /> Invoice
          </button>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}

// ==========================================================================
// Appeals tab
// ==========================================================================

function AppealsTab({ partnerId }: { partnerId: string }) {
  const filters = { partnerId, limit: 50 };
  const { data, isLoading } = useQuery({
    queryKey: QK.PARTNER_APPEALS(filters),
    queryFn: () =>
      import("@/lib/partners/api").then((m) => m.listAppeals(filters)),
  });
  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if ((data?.items.length ?? 0) === 0)
    return (
      <Card className="p-6 text-sm text-slate-500">
        No appeals from this partner.
      </Card>
    );
  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Opened</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Body</TableHead>
            <TableHead>Resolution</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data!.items.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="font-mono text-slate-900">
                #{a.appealNumber}
              </TableCell>
              <TableCell className="text-xs text-slate-500">
                {formatDateTime(a.openedAt)}
              </TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${APPEAL_STATUS_TONE[a.status]}`}
                >
                  {a.status}
                </span>
              </TableCell>
              <TableCell className="text-xs text-slate-700 whitespace-pre-wrap max-w-xl">
                {a.body}
              </TableCell>
              <TableCell className="text-xs text-slate-500 max-w-sm">
                {a.status === "open" ? (
                  <Link
                    href="/admin/partners/queues"
                    className="text-orange-600 hover:text-orange-700 font-medium"
                  >
                    Resolve in queue →
                  </Link>
                ) : (
                  a.resolutionNote ?? "—"
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
