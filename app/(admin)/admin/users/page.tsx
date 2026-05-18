"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { usePagination } from "@/hooks/use-pagination";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/admin/layout/page-header";
import { ExamTypeBadge } from "@/components/admin/shared/exam-type-badge";
import { formatDate, formatNumber, initials, relativeTime } from "@/lib/utils";
import { ROLE_LABEL } from "@/lib/constants";
import type { ExamType, Paginated, User } from "@/types/api";

export default function UsersPage() {
  const { page, limit, setPage } = usePagination(20);
  const [examFilter, setExamFilter] = useState<ExamType | "all">("all");

  const filters = {
    page,
    limit,
    examType: examFilter === "all" ? undefined : examFilter,
  };

  const { data, isLoading } = useQuery({
    queryKey: QK.USERS_LIST(filters),
    queryFn: () =>
      unwrap<Paginated<User>>(
        api.get("/admin/users", { params: filters }),
      ),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Users"
        description="Every registered account. Filter by exam platform; referral and XP balance inline."
      />

      <Card className="p-3 flex items-end gap-3">
        <div>
          <div className="text-xs text-slate-500 mb-1">Exam type</div>
          <Select
            value={examFilter}
            onValueChange={(v) => setExamFilter(v as typeof examFilter)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="bece">BECE</SelectItem>
              <SelectItem value="wassce">WASSCE</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Exam</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Referrals</TableHead>
              <TableHead className="text-right">Spendable XP</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Last active</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={9}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : (data?.items ?? []).map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="flex items-center gap-2 hover:text-primary"
                      >
                        <Avatar>
                          <AvatarFallback>{initials(u.fullName)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-slate-900">
                          {u.fullName}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs">
                      {u.email ?? u.phone ?? "—"}
                    </TableCell>
                    <TableCell>
                      <ExamTypeBadge value={u.examType} />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{ROLE_LABEL[u.role]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(u.referralCount ?? 0)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatNumber(u.spendableXp ?? 0)}
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {formatDate(u.createdAt)}
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {u.lastActiveAt ? relativeTime(u.lastActiveAt) : "—"}
                    </TableCell>
                    <TableCell>
                      {u.isActive ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="destructive">Banned</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </Card>

      <div className="flex items-center justify-end gap-2">
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
