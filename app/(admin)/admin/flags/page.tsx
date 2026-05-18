"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { CheckCheck, Flag } from "lucide-react";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { usePagination } from "@/hooks/use-pagination";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { formatDateTime, truncate } from "@/lib/utils";
import { FLAG_REASON_LABEL } from "@/lib/constants";
import type { Paginated, QuestionFlag } from "@/types/api";

export default function FlagsPage() {
  const { page, limit, setPage } = usePagination(25);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: QK.FLAGS_LIST({ page, limit }),
    queryFn: () =>
      unwrap<Paginated<QuestionFlag>>(
        api.get("/admin/questions/flags", { params: { page, limit } }),
      ),
  });

  const resolve = useMutation({
    mutationFn: (flagId: string) =>
      api.post(`/admin/questions/flags/${flagId}/resolve`),
    onSuccess: () => {
      toast.success("Flag resolved");
      qc.invalidateQueries({ queryKey: ["flags"] });
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Flag queue"
        description="Student-reported issues. Resolve quickly — a wrong answer in circulation erodes trust."
      />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Question</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Reported</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : (data?.items ?? []).map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="max-w-md">
                      <div className="font-medium text-slate-900">
                        {truncate(f.question?.body ?? "—", 80)}
                      </div>
                      {f.note && (
                        <div className="text-xs text-slate-500 mt-1">
                          “{truncate(f.note, 120)}”
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="warning">
                        {FLAG_REASON_LABEL[f.reason]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {formatDateTime(f.createdAt)}
                    </TableCell>
                    <TableCell>
                      {f.isResolved ? (
                        <Badge variant="success">Resolved</Badge>
                      ) : (
                        <Badge variant="destructive">
                          <Flag className="h-3 w-3 mr-1" /> Open
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!f.isResolved && (
                        <Button
                          size="sm"
                          variant="outline"
                          loading={resolve.isPending && resolve.variables === f.id}
                          onClick={() => resolve.mutate(f.id)}
                        >
                          <CheckCheck className="h-3.5 w-3.5" /> Resolve
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            {!isLoading && (data?.items.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-slate-500">
                  🎉 Flag queue is empty.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={(data?.items.length ?? 0) < limit}
          onClick={() => setPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
