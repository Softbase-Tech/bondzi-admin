"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
import type { LegalPage } from "@/types/api";
import { EditLegalPageModal } from "@/components/admin/legal/edit-legal-page-modal";

/**
 * Admin index for legal documents (refund policy, terms, privacy).
 *
 * `refund-policy` is seeded in migration 1860 and linked from the mobile
 * checkout flow — deletion is allowed at the API level but discouraged.
 * Slugs are the natural key the mobile app fetches by.
 */
export default function LegalPagesIndex() {
  const qc = useQueryClient();
  const [editTarget, setEditTarget] = useState<LegalPage | "new" | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: QK.LEGAL_PAGES_LIST(),
    queryFn: () => unwrap<LegalPage[]>(api.get("/admin/legal")),
  });

  const deleteMut = useMutation({
    mutationFn: (slug: string) =>
      unwrap<void>(api.delete(`/admin/legal/${slug}`)),
    onSuccess: () => {
      toast.success("Legal page deleted");
      qc.invalidateQueries({ queryKey: QK.LEGAL_PAGES_LIST() });
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Delete failed"),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Legal pages"
        description="Admin-editable refund policy, terms and privacy documents. Mobile checkout links to these by slug; deleting a slug breaks any link that points to it."
        actions={
          <Button onClick={() => setEditTarget("new")}>
            <Plus className="h-4 w-4" />
            New page
          </Button>
        }
      />

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Slug</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-[140px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((page) => (
                <TableRow key={page.id}>
                  <TableCell className="font-mono text-sm">
                    {page.slug}
                  </TableCell>
                  <TableCell>{page.title}</TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {formatDateTime(page.updatedAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditTarget(page)}
                        aria-label={`Edit ${page.slug}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (
                            confirm(
                              `Delete '${page.slug}'? Any mobile / web link pointing to this slug will break.`,
                            )
                          ) {
                            deleteMut.mutate(page.slug);
                          }
                        }}
                        className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        aria-label={`Delete ${page.slug}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(data ?? []).length === 0 && !isLoading && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-8 text-sm text-slate-500"
                  >
                    No legal pages yet. The migration seeds <code>refund-policy</code> — re-run the migration or create one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      <EditLegalPageModal
        open={editTarget !== null}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        page={editTarget === "new" ? null : editTarget}
      />
    </div>
  );
}
