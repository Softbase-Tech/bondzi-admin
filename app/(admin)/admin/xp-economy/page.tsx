"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Coins, Download, Pencil, Check, X } from "lucide-react";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { formatDate, formatDateTime, formatNumber } from "@/lib/utils";
import { PageHeader } from "@/components/admin/layout/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  Paginated,
  ReferralXpSummary,
  XpEconomyHealth,
  XpRateConfig,
  XpRedemptionConfig,
  XpRedemptionLogRow,
} from "@/types/api";

export default function XpEconomyPage() {
  const qc = useQueryClient();

  const { data: rates, isLoading: ratesLoading } = useQuery({
    queryKey: QK.XP_RATE_CONFIG(),
    queryFn: () =>
      unwrap<XpRateConfig[]>(api.get("/admin/xp-economy/rates")),
  });

  const { data: tiers } = useQuery({
    queryKey: QK.XP_REDEMPTION_CONFIG(),
    queryFn: () =>
      unwrap<XpRedemptionConfig[]>(
        api.get("/admin/xp-economy/redemption-tiers"),
      ),
  });

  const { data: health } = useQuery({
    queryKey: QK.XP_ECONOMY_HEALTH(),
    queryFn: () =>
      unwrap<XpEconomyHealth>(api.get("/admin/xp-economy/health")),
  });

  const { data: referralSummary } = useQuery({
    queryKey: QK.XP_REFERRAL_SUMMARY(),
    queryFn: () =>
      unwrap<ReferralXpSummary>(api.get("/admin/xp-economy/referrals")),
  });

  const { data: log } = useQuery({
    queryKey: QK.XP_REDEMPTION_LOG({ limit: 50 }),
    queryFn: () =>
      unwrap<Paginated<XpRedemptionLogRow>>(
        api.get("/admin/xp-economy/redemption-log", { params: { limit: 50 } }),
      ),
  });

  const rateMut = useMutation({
    mutationFn: (payload: { id: string; xpAmount?: number; isActive?: boolean }) =>
      unwrap(api.patch(`/admin/xp-economy/rates/${payload.id}`, payload)),
    onSuccess: () => {
      toast.success("Rate updated");
      qc.invalidateQueries({ queryKey: QK.XP_RATE_CONFIG() });
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Update failed"),
  });

  const tierMut = useMutation({
    mutationFn: (payload: { id: string; xpCost?: number; isActive?: boolean }) =>
      unwrap(
        api.patch(
          `/admin/xp-economy/redemption-tiers/${payload.id}`,
          payload,
        ),
      ),
    onSuccess: () => {
      toast.success("Tier updated");
      qc.invalidateQueries({ queryKey: QK.XP_REDEMPTION_CONFIG() });
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Update failed"),
  });

  const exportCsv = () => {
    if (!log?.items.length) return;
    const rows = [
      ["User", "Tier", "XP spent", "Credit days", "Applied at"],
      ...log.items.map((r) => [
        r.userName,
        r.tierLabel,
        String(r.xpSpent),
        String(r.creditDays),
        r.appliedAt,
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `xp-redemptions-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="XP Economy"
        description="Earning rates, redemption thresholds, and economy health."
      />

      <Section title="Earning rates" icon={<Coins className="h-4 w-4" />}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead className="font-mono text-xs">Event key</TableHead>
              <TableHead className="text-right">XP amount</TableHead>
              <TableHead>Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ratesLoading && (
              <TableRow>
                <TableCell colSpan={4}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              </TableRow>
            )}
            {rates?.map((r) => (
              <RateRow
                key={r.id}
                row={r}
                onSave={(xp) =>
                  rateMut.mutate({ id: r.id, xpAmount: xp })
                }
                onToggle={(v) => rateMut.mutate({ id: r.id, isActive: v })}
              />
            ))}
          </TableBody>
        </Table>
      </Section>

      <Section
        title="Redemption tiers"
        icon={<Coins className="h-4 w-4" />}
        note="Reducing XP cost affects all students currently saving toward that tier."
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tier</TableHead>
              <TableHead className="text-right">XP cost</TableHead>
              <TableHead className="text-right">Credit days</TableHead>
              <TableHead>Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tiers?.map((t) => (
              <TierRow
                key={t.id}
                row={t}
                onSave={(xp) => tierMut.mutate({ id: t.id, xpCost: xp })}
                onToggle={(v) => tierMut.mutate({ id: t.id, isActive: v })}
              />
            ))}
          </TableBody>
        </Table>
      </Section>

      <Section title="Economy health">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricBox label="XP outstanding" value={health?.spendableXpOutstanding} />
          <MetricBox label="Issued this week" value={health?.xpIssuedThisWeek} />
          <MetricBox label="Redeemed this week" value={health?.xpRedeemedThisWeek} />
          <MetricBox
            label="Redemption rate"
            value={
              health ? `${Math.round(health.redemptionRate * 100)}%` : undefined
            }
          />
        </div>
        <div className="mt-4 h-64">
          {health?.daily30d ? (
            <ResponsiveContainer width="100%" height={256}>
              <LineChart data={health.daily30d}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  labelFormatter={(l) => formatDate(String(l))}
                  formatter={(v) => formatNumber(Number(v))}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="issued"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="redeemed"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Skeleton className="h-full w-full" />
          )}
        </div>
      </Section>

      <Section title="Referral XP summary">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          <MetricBox
            label="Total referral XP issued"
            value={referralSummary?.totalReferralXp}
          />
          <MetricBox
            label="Active referral chains"
            value={referralSummary?.activeChains}
          />
          <MetricBox
            label="Top referrers"
            value={referralSummary?.topReferrers.length ?? 0}
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>User</TableHead>
              <TableHead className="text-right">Referrals</TableHead>
              <TableHead className="text-right">XP earned</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {referralSummary?.topReferrers.map((r, i) => (
              <TableRow key={r.userId}>
                <TableCell>{i + 1}</TableCell>
                <TableCell>{r.fullName}</TableCell>
                <TableCell className="text-right">
                  {formatNumber(r.referralCount)}
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(r.totalXp)}
                </TableCell>
              </TableRow>
            ))}
            {!referralSummary?.topReferrers.length && (
              <TableRow>
                <TableCell colSpan={4} className="py-6 text-center text-slate-500">
                  No referral earners yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Section>

      <Section
        title="Recent redemptions"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            disabled={!log?.items.length}
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead className="text-right">XP spent</TableHead>
              <TableHead className="text-right">Days granted</TableHead>
              <TableHead>Applied</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {log?.items.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.userName}</TableCell>
                <TableCell>{r.tierLabel}</TableCell>
                <TableCell className="text-right">
                  {formatNumber(r.xpSpent)}
                </TableCell>
                <TableCell className="text-right">{r.creditDays}</TableCell>
                <TableCell className="text-slate-500 text-sm">
                  {formatDateTime(r.appliedAt)}
                </TableCell>
              </TableRow>
            ))}
            {!log?.items.length && (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-slate-500">
                  No redemptions yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Section>
    </div>
  );
}

function Section({
  title,
  icon,
  note,
  actions,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  note?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            {icon}
            {title}
          </CardTitle>
          {note && <p className="text-xs text-slate-500 mt-1">{note}</p>}
        </div>
        {actions}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function MetricBox({
  label,
  value,
}: {
  label: string;
  value: number | string | undefined;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold text-slate-900">
        {value === undefined ? (
          <Skeleton className="h-6 w-16" />
        ) : typeof value === "number" ? (
          formatNumber(value)
        ) : (
          value
        )}
      </div>
    </div>
  );
}

function RateRow({
  row,
  onSave,
  onToggle,
}: {
  row: XpRateConfig;
  onSave: (xp: number) => void;
  onToggle: (v: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(row.xpAmount);
  return (
    <TableRow>
      <TableCell>{row.label}</TableCell>
      <TableCell className="font-mono text-xs text-slate-500">
        {row.eventKey}
      </TableCell>
      <TableCell className="text-right">
        {editing ? (
          <div className="inline-flex items-center gap-1">
            <input
              type="number"
              aria-label={`XP amount for ${row.eventKey}`}
              value={val}
              onChange={(e) => setVal(Number(e.target.value))}
              className="h-8 w-24 rounded-md border border-slate-200 px-2 text-right"
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                onSave(val);
                setEditing(false);
              }}
            >
              <Check className="h-4 w-4 text-emerald-600" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                setVal(row.xpAmount);
                setEditing(false);
              }}
            >
              <X className="h-4 w-4 text-slate-500" />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            className="inline-flex items-center gap-1 hover:text-primary"
            onClick={() => setEditing(true)}
          >
            <span className="font-semibold">{formatNumber(row.xpAmount)}</span>
            <Pencil className="h-3 w-3 text-slate-400" />
          </button>
        )}
      </TableCell>
      <TableCell>
        <Switch checked={row.isActive} onCheckedChange={onToggle} />
      </TableCell>
    </TableRow>
  );
}

function TierRow({
  row,
  onSave,
  onToggle,
}: {
  row: XpRedemptionConfig;
  onSave: (xp: number) => void;
  onToggle: (v: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(row.xpCost);
  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{row.label}</div>
        <div className="font-mono text-xs text-slate-500">{row.tierKey}</div>
      </TableCell>
      <TableCell className="text-right">
        {editing ? (
          <div className="inline-flex items-center gap-1">
            <input
              type="number"
              aria-label={`XP cost for ${row.tierKey}`}
              value={val}
              onChange={(e) => setVal(Number(e.target.value))}
              className="h-8 w-28 rounded-md border border-slate-200 px-2 text-right"
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                onSave(val);
                setEditing(false);
              }}
            >
              <Check className="h-4 w-4 text-emerald-600" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                setVal(row.xpCost);
                setEditing(false);
              }}
            >
              <X className="h-4 w-4 text-slate-500" />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            className="inline-flex items-center gap-1 hover:text-primary"
            onClick={() => setEditing(true)}
          >
            <span className="font-semibold">{formatNumber(row.xpCost)}</span>
            <Pencil className="h-3 w-3 text-slate-400" />
          </button>
        )}
      </TableCell>
      <TableCell className="text-right">
        <Badge variant="outline">{row.creditDays} days</Badge>
      </TableCell>
      <TableCell>
        <Switch checked={row.isActive} onCheckedChange={onToggle} />
      </TableCell>
    </TableRow>
  );
}
