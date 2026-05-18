"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Archive,
  CheckCircle2,
  Clock,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Star,
} from "lucide-react";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { PageHeader } from "@/components/admin/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DEFAULT_PROVIDER_TONE,
  PROVIDER_TONE,
} from "@/lib/constants";
import { formatDateTime, formatGHS } from "@/lib/utils";
import type { SubscriptionPlan } from "@/types/api";
import { CreatePlanModal } from "@/components/admin/plans/create-plan-modal";
import { EditPlanModal } from "@/components/admin/plans/edit-plan-modal";

export default function PlansPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SubscriptionPlan | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: QK.PLANS_LIST({ includeInactive: true }),
    queryFn: () =>
      unwrap<SubscriptionPlan[]>(
        api.get("/admin/plans", { params: { includeInactive: true } }),
      ),
  });

  const syncMut = useMutation({
    mutationFn: (id: string) =>
      unwrap<SubscriptionPlan>(api.post(`/admin/plans/${id}/sync`)),
    onSuccess: () => {
      toast.success("Provider codes synced");
      qc.invalidateQueries({ queryKey: ["plans"] });
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Sync failed"),
  });

  const setDefaultMut = useMutation({
    mutationFn: (id: string) =>
      unwrap<SubscriptionPlan>(api.post(`/admin/plans/${id}/set-default`)),
    onSuccess: () => {
      toast.success("Default plan updated");
      qc.invalidateQueries({ queryKey: ["plans"] });
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Failed to set default"),
  });

  const archiveMut = useMutation({
    mutationFn: (id: string) =>
      unwrap<SubscriptionPlan>(api.delete(`/admin/plans/${id}`)),
    onSuccess: () => {
      toast.success("Plan archived");
      qc.invalidateQueries({ queryKey: ["plans"] });
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Archive failed"),
  });

  const rollbackMut = useMutation({
    mutationFn: (id: string) =>
      unwrap<SubscriptionPlan>(api.post(`/admin/plans/${id}/rollback`)),
    onSuccess: () => {
      toast.success("Version restored");
      qc.invalidateQueries({ queryKey: ["plans"] });
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Rollback failed"),
  });

  /**
   * Group rows by (countryCode, root plan) so each country/chain renders as
   * a contiguous block. Root = the oldest ancestor reachable via parent_plan_id.
   */
  const groups = useMemo(() => groupByChain(data ?? []), [data]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Plans"
        description="Subscription plans per country. Price changes insert a new version — old rows stay archived so existing subscribers keep renewing on their purchased prices."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            New plan
          </Button>
        }
      />

      {isLoading ? (
        <Card className="p-4">
          <Skeleton className="h-32 w-full" />
        </Card>
      ) : groups.length === 0 ? (
        <Card className="p-12 text-center text-slate-500">
          No plans yet. Click <strong>New plan</strong> to create the first
          one.
        </Card>
      ) : (
        groups.map((g) => (
          <ChainCard
            key={g.key}
            countryCode={g.countryCode}
            rows={g.rows}
            onEdit={(p) => setEditTarget(p)}
            onSync={(p) => syncMut.mutate(p.id)}
            onSetDefault={(p) => setDefaultMut.mutate(p.id)}
            onArchive={(p) => archiveMut.mutate(p.id)}
            onRollback={(p) => rollbackMut.mutate(p.id)}
            pendingId={
              syncMut.isPending
                ? syncMut.variables
                : setDefaultMut.isPending
                  ? setDefaultMut.variables
                  : archiveMut.isPending
                    ? archiveMut.variables
                    : rollbackMut.isPending
                      ? rollbackMut.variables
                      : null
            }
          />
        ))
      )}

      <CreatePlanModal open={createOpen} onOpenChange={setCreateOpen} />
      <EditPlanModal
        open={editTarget !== null}
        onOpenChange={(o) => !o && setEditTarget(null)}
        plan={editTarget}
      />
    </div>
  );
}

// -----------------------------------------------------------------------------

interface Chain {
  key: string;
  countryCode: string;
  rows: SubscriptionPlan[];
}

function groupByChain(rows: SubscriptionPlan[]): Chain[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const rootOf = (plan: SubscriptionPlan): string => {
    let cur = plan;
    const seen = new Set<string>();
    while (cur.parentPlanId && !seen.has(cur.id)) {
      seen.add(cur.id);
      const parent = byId.get(cur.parentPlanId);
      if (!parent) break;
      cur = parent;
    }
    return cur.id;
  };

  const buckets = new Map<string, Chain>();
  for (const r of rows) {
    const key = `${r.countryCode}:${rootOf(r)}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { key, countryCode: r.countryCode, rows: [] };
      buckets.set(key, bucket);
    }
    bucket.rows.push(r);
  }

  for (const b of buckets.values()) {
    b.rows.sort((a, b) => b.version - a.version);
  }
  return [...buckets.values()].sort((a, b) =>
    a.countryCode.localeCompare(b.countryCode),
  );
}

function ChainCard({
  countryCode,
  rows,
  onEdit,
  onSync,
  onSetDefault,
  onArchive,
  onRollback,
  pendingId,
}: {
  countryCode: string;
  rows: SubscriptionPlan[];
  onEdit: (p: SubscriptionPlan) => void;
  onSync: (p: SubscriptionPlan) => void;
  onSetDefault: (p: SubscriptionPlan) => void;
  onArchive: (p: SubscriptionPlan) => void;
  onRollback: (p: SubscriptionPlan) => void;
  pendingId: string | null;
}) {
  const latest = rows[0];
  return (
    <Card>
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <span className="inline-flex items-center rounded-sm border bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700 border-slate-200">
          {countryCode}
        </span>
        <span className="text-sm font-medium text-slate-900">
          {latest.name}
        </span>
        <span className="text-xs text-slate-500">
          {rows.length} version{rows.length === 1 ? "" : "s"}
        </span>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Version</TableHead>
            <TableHead>Monthly</TableHead>
            <TableHead>6-month</TableHead>
            <TableHead>Annual</TableHead>
            <TableHead>Provider</TableHead>
            <TableHead>Provider codes</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="w-16 text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((p) => {
            const grace = graceWindow(p.archiveAt);
            return (
            <TableRow key={p.id} className={p.isActive ? "" : "opacity-60"}>
              <TableCell>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-slate-700">
                    v{p.version}
                  </span>
                  {p.isActive ? (
                    <span className="inline-flex items-center rounded-sm border bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700 border-emerald-200">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-sm border bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 border-slate-200">
                      Archived
                    </span>
                  )}
                  {p.isDefault && (
                    <span className="inline-flex items-center gap-1 rounded-sm border bg-amber-50 px-2 py-0.5 text-[11px] text-amber-800 border-amber-200">
                      <Star className="h-3 w-3" /> Default
                    </span>
                  )}
                  {grace && (
                    // Grace period after a version bump (#73). Plan is
                    // hidden from new purchases but still resolves for
                    // webhooks tied to open authorizationUrls.
                    <span
                      className="inline-flex items-center gap-1 rounded-sm border bg-amber-50 px-2 py-0.5 text-[11px] text-amber-800 border-amber-200"
                      title="Plan is in the post-version-bump grace window. New shoppers see the next version; webhooks for in-flight checkouts still resolve to this row."
                    >
                      <Clock className="h-3 w-3" /> {grace}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm text-slate-900">
                  {formatGHS(p.monthlyPrice)}
                </div>
                <div className="text-[11px] text-slate-500">
                  {p.monthlyDurationDays}d
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm text-slate-900">
                  {formatGHS(p.sixMonthPrice)}
                </div>
                <div className="text-[11px] text-slate-500">
                  {p.sixMonthDurationDays}d
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm text-slate-900">
                  {formatGHS(p.annualPrice)}
                </div>
                <div className="text-[11px] text-slate-500">
                  {p.annualDurationDays}d
                </div>
              </TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs ${
                    PROVIDER_TONE[p.provider] ?? DEFAULT_PROVIDER_TONE
                  }`}
                >
                  {p.provider}
                </span>
              </TableCell>
              <TableCell>
                <ProviderCodes plan={p} />
              </TableCell>
              <TableCell className="text-xs text-slate-500">
                {formatDateTime(p.updatedAt)}
              </TableCell>
              <TableCell className="text-right">
                <RowActions
                  plan={p}
                  isPending={pendingId === p.id}
                  onEdit={onEdit}
                  onSync={onSync}
                  onSetDefault={onSetDefault}
                  onArchive={onArchive}
                  onRollback={onRollback}
                />
              </TableCell>
            </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

/**
 * Returns a short label like "Archives in 12h" when the plan's
 * archiveAt is set AND in the future. Null otherwise (badge hidden).
 * The backend cron clears archiveAt → deletedAt after the window
 * passes, so a row past archiveAt should drop off the list anyway.
 */
function graceWindow(archiveAt: string | null): string | null {
  if (!archiveAt) return null;
  const ms = new Date(archiveAt).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const hours = Math.round(ms / (60 * 60 * 1000));
  if (hours <= 1) {
    const mins = Math.max(1, Math.round(ms / (60 * 1000)));
    return `Archives in ${mins}m`;
  }
  if (hours < 24) return `Archives in ${hours}h`;
  const days = Math.round(hours / 24);
  return `Archives in ${days}d`;
}

function ProviderCodes({ plan }: { plan: SubscriptionPlan }) {
  const entries: Array<[string, string | null]> = [
    ["monthly", plan.providerPlanMonthly],
    ["6-month", plan.providerPlanSixMonth],
    ["annual", plan.providerPlanAnnual],
  ];
  const missing = entries.filter(([, c]) => !c).length;
  return (
    <div className="flex flex-col gap-0.5 text-[11px] font-mono">
      {entries.map(([label, code]) => (
        <div key={label} className="flex items-center gap-2">
          <span className="text-slate-500 w-12">{label}</span>
          {code ? (
            <span className="text-slate-700 truncate max-w-[11rem]">{code}</span>
          ) : (
            <span className="text-amber-700">— missing</span>
          )}
        </div>
      ))}
      {missing > 0 && (
        <span className="mt-0.5 text-[10px] text-amber-700">
          Run <code>Sync</code> to create missing codes
        </span>
      )}
    </div>
  );
}

function RowActions({
  plan,
  isPending,
  onEdit,
  onSync,
  onSetDefault,
  onArchive,
  onRollback,
}: {
  plan: SubscriptionPlan;
  isPending: boolean;
  onEdit: (p: SubscriptionPlan) => void;
  onSync: (p: SubscriptionPlan) => void;
  onSetDefault: (p: SubscriptionPlan) => void;
  onArchive: (p: SubscriptionPlan) => void;
  onRollback: (p: SubscriptionPlan) => void;
}) {
  const missingCodes =
    !plan.providerPlanMonthly ||
    !plan.providerPlanSixMonth ||
    !plan.providerPlanAnnual;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={isPending}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {plan.isActive && (
          <>
            <DropdownMenuItem onClick={() => onEdit(plan)}>
              <Pencil className="h-3.5 w-3.5 mr-2" />
              Edit
            </DropdownMenuItem>
            {!plan.isDefault && (
              <DropdownMenuItem onClick={() => onSetDefault(plan)}>
                <Star className="h-3.5 w-3.5 mr-2" />
                Set as default
              </DropdownMenuItem>
            )}
            {missingCodes && (
              <DropdownMenuItem onClick={() => onSync(plan)}>
                <RefreshCw className="h-3.5 w-3.5 mr-2" />
                Sync missing codes
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-rose-700 focus:text-rose-700"
              onClick={() => onArchive(plan)}
            >
              <Archive className="h-3.5 w-3.5 mr-2" />
              Archive
            </DropdownMenuItem>
          </>
        )}
        {!plan.isActive && (
          <DropdownMenuItem
            onClick={() => onRollback(plan)}
            disabled={missingCodes}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-2" />
            {missingCodes ? (
              <span className="text-slate-500">
                Restore (sync codes first)
              </span>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                Restore this version
              </>
            )}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
