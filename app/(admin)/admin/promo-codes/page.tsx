"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Plus, Trash2 } from "lucide-react";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { PageHeader } from "@/components/admin/layout/page-header";
import { Button } from "@/components/ui/button";
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
import type { PromoCode } from "@/types/api";
import { CreatePromoCodeModal } from "@/components/admin/promo-codes/create-promo-code-modal";
import { EditPromoCodeModal } from "@/components/admin/promo-codes/edit-promo-code-modal";

export default function PromoCodesPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PromoCode | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: QK.PROMO_CODES_LIST(),
    queryFn: () => unwrap<PromoCode[]>(api.get("/admin/promo-codes")),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      unwrap<void>(api.delete(`/admin/promo-codes/${id}`)),
    onSuccess: () => {
      toast.success("Promo code deleted");
      qc.invalidateQueries({ queryKey: QK.PROMO_CODES_LIST() });
    },
    onError: (e: { message?: string }) => {
      // Codes with redemptions can't be hard-deleted (FK RESTRICT) —
      // surface the friendly hint so admins reach for "Deactivate" instead.
      toast.error(
        e.message ??
          "Deletion failed. Deactivate the code instead if it has redemptions.",
      );
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Promo codes"
        description="Discount codes redeemed at checkout. Codes are case-insensitive — stored lowercased."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New code
          </Button>
        }
      />

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Used</TableHead>
                <TableHead>Validity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => setEditTarget(c)}
                >
                  <TableCell className="font-mono text-sm">{c.code}</TableCell>
                  <TableCell>
                    {c.discountType === "percent"
                      ? `${Number(c.discountValue)}%`
                      : `${Number(c.discountValue).toFixed(2)} GHS`}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {scopeLabel(c)}
                  </TableCell>
                  <TableCell>
                    {c.redeemedCount}
                    {c.maxRedemptions !== null && ` / ${c.maxRedemptions}`}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {validityLabel(c)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        c.isActive
                          ? "text-emerald-700 text-xs font-medium"
                          : "text-slate-400 text-xs font-medium"
                      }
                    >
                      {c.isActive ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (
                          confirm(
                            `Delete '${c.code}'? Codes with prior redemptions can't be deleted — deactivate instead.`,
                          )
                        ) {
                          deleteMut.mutate(c.id);
                        }
                      }}
                      className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      aria-label={`Delete ${c.code}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(data ?? []).length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-sm text-slate-500">
                    No promo codes yet. Create one to start discounting checkouts.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      <CreatePromoCodeModal
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
      <EditPromoCodeModal
        open={editTarget !== null}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        promoCode={editTarget}
      />
    </div>
  );
}

function scopeLabel(c: PromoCode): string {
  const parts: string[] = [];
  if (c.applicableAccount) parts.push(c.applicableAccount.toUpperCase());
  if (c.applicableLevel) parts.push(c.applicableLevel.toUpperCase());
  return parts.length ? parts.join(" · ") : "Any plan";
}

function validityLabel(c: PromoCode): string {
  if (!c.validFrom && !c.validUntil) return "No window";
  const from = c.validFrom ? formatDateTime(c.validFrom) : "now";
  const until = c.validUntil ? formatDateTime(c.validUntil) : "no end";
  return `${from} → ${until}`;
}
