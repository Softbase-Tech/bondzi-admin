"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/admin/layout/page-header";
import { RedactedJson } from "@/components/admin/redacted-json";
import { formatDateTime } from "@/lib/utils";
import type { AuditLogRow, Paginated } from "@/types/api";

export default function AuditPage() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: QK.AUDIT_LOG({}),
    queryFn: () =>
      unwrap<Paginated<AuditLogRow>>(api.get("/admin/audit")).catch(
        () =>
          ({
            items: [],
            total: 0,
            nextCursor: null,
          }) as Paginated<AuditLogRow>,
      ),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Audit log"
        description="Every admin action — immutable record for security reviews."
      />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Admin</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>When</TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : (data?.items ?? []).flatMap((row) => {
                  const hasDelta =
                    row.oldValue !== null || row.newValue !== null;
                  const isOpen = expanded === row.id;
                  return [
                    <TableRow key={row.id}>
                      <TableCell className="p-0 pl-2">
                        {hasDelta && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setExpanded(isOpen ? null : row.id)
                            }
                            aria-label={isOpen ? "Collapse" : "Expand"}
                          >
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-slate-500">
                        {row.adminId.slice(0, 8)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {row.action}
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {row.entityType}
                        {row.entityId
                          ? ` · ${row.entityId.slice(0, 8)}`
                          : ""}
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {formatDateTime(row.createdAt)}
                      </TableCell>
                      <TableCell className="text-slate-500 font-mono text-[11px]">
                        {row.ipAddress ?? "—"}
                      </TableCell>
                    </TableRow>,
                    isOpen ? (
                      <TableRow key={`${row.id}-detail`}>
                        <TableCell colSpan={6} className="bg-slate-50">
                          {/* PII (email / phone / password_hash etc) is
                              scrubbed at write time on the backend. The
                              "redacted" chip below appears wherever a
                              value was stripped — see redact-pii.util.ts. */}
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div>
                              <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                                Before
                              </div>
                              <RedactedJson value={row.oldValue} />
                            </div>
                            <div>
                              <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                                After
                              </div>
                              <RedactedJson value={row.newValue} />
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : null,
                  ];
                })}
            {!isLoading && (data?.items.length ?? 0) === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-12 text-center text-slate-500"
                >
                  No audit events yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
