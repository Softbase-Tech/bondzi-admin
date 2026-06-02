"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ShieldCheck, ShieldX, History } from "lucide-react";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import type {
  EntitlementAuditRow,
  PlanLevel,
  UserEntitlement,
} from "@/types/api";
import { GrantEntitlementModal } from "./grant-entitlement-modal";
import { RevokeEntitlementModal } from "./revoke-entitlement-modal";

const LEVEL_LABEL: Record<PlanLevel, string> = {
  bece: "BECE (JHS)",
  wassce: "WASSCE (SHS)",
  novdec: "NOVDEC (Remedial)",
};

interface Props {
  userId: string;
}

/**
 * Renders the user's effective entitlement on each of BECE / WASSCE /
 * NOVDEC, with Grant + Revoke actions per row. Audit history is shown
 * below the table — collapsed by default to keep the page tidy.
 *
 * Hits two admin endpoints:
 *   GET /admin/entitlements/user/:userId        — current state
 *   GET /admin/entitlements/user/:userId/audit  — change log
 */
export function UserEntitlementsSection({ userId }: Props) {
  const qc = useQueryClient();
  const [grantTarget, setGrantTarget] = useState<PlanLevel | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<UserEntitlement | null>(
    null,
  );
  const [auditOpen, setAuditOpen] = useState(false);

  const { data: entitlements, isLoading } = useQuery({
    queryKey: QK.ENTITLEMENTS_FOR_USER(userId),
    queryFn: () =>
      unwrap<UserEntitlement[]>(
        api.get(`/admin/entitlements/user/${userId}`),
      ),
  });

  const { data: audit } = useQuery({
    queryKey: QK.ENTITLEMENTS_AUDIT_FOR_USER(userId),
    queryFn: () =>
      unwrap<EntitlementAuditRow[]>(
        api.get(`/admin/entitlements/user/${userId}/audit`),
      ),
    enabled: auditOpen,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: QK.ENTITLEMENTS_FOR_USER(userId) });
    qc.invalidateQueries({
      queryKey: QK.ENTITLEMENTS_AUDIT_FOR_USER(userId),
    });
    // The subscription-history table on the parent page reads from
    // /admin/users/:id — invalidate that too so a manual grant lands
    // in both views without a refresh.
    qc.invalidateQueries({ queryKey: QK.USER_DETAIL?.(userId) ?? ["users", userId] });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Entitlements</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAuditOpen((v) => !v)}
        >
          <History className="h-3.5 w-3.5" />
          {auditOpen ? "Hide audit" : "Show audit"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <div className="divide-y divide-slate-100 rounded-md border border-slate-200">
            {(entitlements ?? []).map((ent) => (
              <EntitlementRow
                key={ent.level}
                ent={ent}
                onGrant={() => setGrantTarget(ent.level)}
                onRevoke={() => setRevokeTarget(ent)}
              />
            ))}
          </div>
        )}

        {auditOpen && (
          <div className="rounded-md border border-slate-200 bg-slate-50/50 p-3">
            <div className="text-xs font-medium text-slate-700 mb-2">
              Manual changes (latest first)
            </div>
            {(audit ?? []).length === 0 ? (
              <p className="text-xs text-slate-500">
                No manual entitlement changes yet.
              </p>
            ) : (
              <ul className="space-y-1">
                {(audit ?? []).map((row) => (
                  <AuditRow key={row.id} row={row} />
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>

      <GrantEntitlementModal
        open={grantTarget !== null}
        onOpenChange={(open) => {
          if (!open) setGrantTarget(null);
        }}
        userId={userId}
        level={grantTarget}
        onSaved={() => {
          refresh();
          setGrantTarget(null);
        }}
      />
      <RevokeEntitlementModal
        open={revokeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
        userId={userId}
        entitlement={revokeTarget}
        onSaved={() => {
          refresh();
          setRevokeTarget(null);
        }}
      />
    </Card>
  );
}

function EntitlementRow({
  ent,
  onGrant,
  onRevoke,
}: {
  ent: UserEntitlement;
  onGrant: () => void;
  onRevoke: () => void;
}) {
  const isPaid = ent.account !== "free";
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-slate-900 w-44">
          {LEVEL_LABEL[ent.level]}
        </span>
        <Badge
          variant={
            ent.account === "pro"
              ? "default"
              : ent.account === "plus"
                ? "indigo"
                : "outline"
          }
          className="uppercase"
        >
          {ent.account}
        </Badge>
        {ent.expiresAt && (
          <span className="text-xs text-slate-500">
            until {formatDate(ent.expiresAt)}
          </span>
        )}
        {isPaid && !ent.expiresAt && (
          <span className="text-xs text-slate-500">lifetime</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onGrant}>
          <ShieldCheck className="h-3.5 w-3.5" />
          Grant
        </Button>
        {isPaid && (
          <Button
            variant="outline"
            size="sm"
            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 border-rose-200"
            onClick={onRevoke}
          >
            <ShieldX className="h-3.5 w-3.5" />
            Revoke
          </Button>
        )}
      </div>
    </div>
  );
}

function AuditRow({ row }: { row: EntitlementAuditRow }) {
  // `action` is dot-separated: `entitlement.grant`, `entitlement.revoke`,
  // `entitlement.refund`. Strip the prefix for display.
  const action = row.action.replace(/^entitlement\./, "");
  const reason =
    typeof row.newValue === "object" && row.newValue !== null
      ? (row.newValue as { reason?: string }).reason
      : undefined;
  return (
    <li className="text-xs text-slate-700 flex flex-wrap items-baseline gap-2">
      <span className="font-mono uppercase text-[10px] text-slate-500">
        {action}
      </span>
      <span className="text-slate-400">·</span>
      <span>{formatDate(row.createdAt)}</span>
      <span className="text-slate-400">·</span>
      <span className="text-slate-500">
        admin <code>{row.adminId.slice(0, 8)}</code>
      </span>
      {reason && (
        <span className="text-slate-600">— &ldquo;{reason}&rdquo;</span>
      )}
    </li>
  );
}
