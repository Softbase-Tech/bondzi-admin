"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Infinity as InfinityIcon, X } from "lucide-react";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { PageHeader } from "@/components/admin/layout/page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";
import type {
  AccountType,
  EntitlementPolicy,
  EntitlementServiceKey,
} from "@/types/api";
import { EditEntitlementModal } from "@/components/admin/entitlements/edit-entitlement-modal";

/**
 * Tier × Service matrix. One row per service, three cells (Free/Plus/Pro).
 * Each cell shows enabled state + daily cap; click to edit. Nothing on
 * this page bypasses the backend — every save goes through
 * `PATCH /admin/entitlements/:tier/:service`, which stamps the row's
 * `updatedBy` with the acting admin.
 *
 * Read-only surface (Free/Plus/Pro) — accounts are managed elsewhere;
 * this page is exclusively about which capability each tier gets +
 * at what cap.
 */
const TIERS: readonly AccountType[] = ["free", "plus", "pro"] as const;

/**
 * Display metadata for each service. Kept next to the page (not in a
 * shared file) so a new service surface's admin-visible label /
 * description is easy to spot when adding one.
 */
const SERVICE_META: Record<
  EntitlementServiceKey,
  { label: string; description: string }
> = {
  past_papers_core: {
    label: "Past papers — core subjects",
    description:
      "English, Maths, Science, Social Studies. Free tier keeps unlimited access here.",
  },
  past_papers_elective: {
    label: "Past papers — elective subjects",
    description:
      "All non-core WAEC subjects. Free is metered; Plus/Pro unlimited.",
  },
  level_tests: {
    label: "Level Tests",
    description:
      "AI-generated form-level practice. Requires a form level (NOVDEC students refused via config).",
  },
  mock_exams: {
    label: "Mock Exams",
    description:
      "Timed full-paper simulations. Uses pre-generated PM-Test pool + mock_exam_templates.",
  },
  ai_explanations: {
    label: "AI Explanations",
    description:
      "Per-question AI walkthroughs. Read-throttle; content is pre-generated at admin batch time.",
  },
  post_exam_ai_breakdown: {
    label: "Post-exam AI Breakdown",
    description:
      "AI summary of a whole exam (weakness areas + suggested drill). Feature deferred — leave disabled.",
  },
  ai_weakness_narratives: {
    label: "AI Weakness Narratives",
    description:
      "Personalised 'why you're weak here' narrative on top of the free SQL detection. Pinned to Bedrock.",
  },
};

const SERVICE_ORDER: EntitlementServiceKey[] = [
  "past_papers_core",
  "past_papers_elective",
  "level_tests",
  "mock_exams",
  "ai_explanations",
  "post_exam_ai_breakdown",
  "ai_weakness_narratives",
];

interface EditTarget {
  tier: AccountType;
  service: EntitlementServiceKey;
  policy: EntitlementPolicy;
}

export default function EntitlementsPage() {
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: QK.ENTITLEMENTS_MATRIX(),
    queryFn: () =>
      unwrap<EntitlementPolicy[]>(api.get("/admin/entitlements")),
  });

  // Fast lookup by (tier, service). Rebuild only when data changes.
  const cellIndex = useMemo(() => {
    const map = new Map<string, EntitlementPolicy>();
    for (const p of data ?? []) {
      map.set(cellKey(p.accountType, p.service), p);
    }
    return map;
  }, [data]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Entitlements"
        description="Tier × service matrix. Click a cell to change what a tier gets and its daily cap. Saves stamp who made the edit."
      />

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[240px]">Service</TableHead>
              {TIERS.map((t) => (
                <TableHead key={t} className="text-center capitalize">
                  {t}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              SERVICE_ORDER.map((s) => (
                <TableRow key={`skeleton-${s}`}>
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  {TIERS.map((t) => (
                    <TableCell key={`${s}-${t}`}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!isLoading &&
              SERVICE_ORDER.map((service) => {
                const meta = SERVICE_META[service];
                return (
                  <TableRow key={service} className="align-top">
                    <TableCell>
                      <div className="font-medium text-slate-900">
                        {meta.label}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500 leading-snug">
                        {meta.description}
                      </div>
                      <code className="mt-1 inline-block text-[10px] font-mono text-slate-400">
                        {service}
                      </code>
                    </TableCell>
                    {TIERS.map((tier) => {
                      const policy = cellIndex.get(cellKey(tier, service));
                      if (!policy) {
                        return (
                          <TableCell
                            key={`${service}-${tier}`}
                            className="text-center"
                          >
                            <span className="text-xs text-slate-400">
                              (unseeded)
                            </span>
                          </TableCell>
                        );
                      }
                      return (
                        <TableCell
                          key={`${service}-${tier}`}
                          className="text-center"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setEditTarget({ tier, service, policy })
                            }
                            className={`w-full rounded-md border px-3 py-2 text-left transition hover:border-slate-400 ${
                              policy.enabled
                                ? "border-emerald-200 bg-emerald-50/40"
                                : "border-slate-200 bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="flex items-center gap-1 text-sm">
                                {policy.enabled ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                ) : (
                                  <X className="h-3.5 w-3.5 text-slate-400" />
                                )}
                                <span className="font-medium">
                                  {policy.enabled ? "Enabled" : "Disabled"}
                                </span>
                              </span>
                              <span className="flex items-center gap-1 text-xs text-slate-600">
                                {policy.dailyCap === null ? (
                                  <>
                                    <InfinityIcon className="h-3 w-3" />
                                    unlimited
                                  </>
                                ) : (
                                  <>
                                    <span className="tabular-nums font-medium">
                                      {policy.dailyCap}
                                    </span>{" "}
                                    / day
                                  </>
                                )}
                              </span>
                            </div>
                            {Object.keys(policy.config ?? {}).length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-slate-500">
                                {Object.entries(policy.config).map(([k, v]) => (
                                  <code
                                    key={k}
                                    className="rounded bg-slate-100 px-1 font-mono"
                                  >
                                    {k}={String(v)}
                                  </code>
                                ))}
                              </div>
                            )}
                            <div className="mt-1 text-[10px] text-slate-400">
                              updated {formatDateTime(policy.updatedAt)}
                            </div>
                          </button>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </Card>

      {editTarget && (
        <EditEntitlementModal
          open
          onOpenChange={(o) => !o && setEditTarget(null)}
          tier={editTarget.tier}
          service={editTarget.service}
          serviceLabel={SERVICE_META[editTarget.service].label}
          policy={editTarget.policy}
        />
      )}
    </div>
  );
}

function cellKey(tier: AccountType, service: EntitlementServiceKey): string {
  return `${tier}:${service}`;
}
