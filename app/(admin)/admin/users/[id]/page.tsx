"use client";

import { use } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Ban, Mail, Phone } from "lucide-react";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/admin/layout/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExamTypeBadge } from "@/components/admin/shared/exam-type-badge";
import {
  formatDate,
  formatDateTime,
  formatGHS,
  formatNumber,
  initials,
  relativeTime,
} from "@/lib/utils";
import {
  STATUS_LABEL,
  STATUS_TONE,
  billingIntervalLabel,
  billingIntervalTone,
} from "@/lib/constants";
import { usePermissions } from "@/hooks/use-permissions";
import { UserEntitlementsSection } from "@/components/admin/users/user-entitlements-section";
import { SendPushSheet } from "@/components/admin/users/send-push-sheet";
import type {
  AdminUserExamRow,
  Paginated,
  Subscription,
  User,
} from "@/types/api";

interface UserDetailResponse {
  user: User;
  subscriptions: Subscription[];
  examsCount: number;
  aiUsage: { calls: string; cost: string } | null;
}

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { canBanUsers } = usePermissions();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: QK.USER_DETAIL(id),
    queryFn: () =>
      unwrap<UserDetailResponse>(api.get(`/admin/users/${id}`)),
  });

  // Per-user exam history. Capped at 20 most recent on the detail
  // page; the dedicated /admin/users/:id/exams/:examId route handles
  // deep dives.
  const { data: exams } = useQuery({
    queryKey: QK.USER_EXAMS(id, { page: 1, limit: 20 }),
    queryFn: () =>
      unwrap<Paginated<AdminUserExamRow>>(
        api.get(`/admin/users/${id}/exams`, {
          params: { page: 1, limit: 20 },
        }),
      ),
  });

  const ban = useMutation({
    mutationFn: () => api.patch(`/admin/users/${id}/ban`),
    onSuccess: () => {
      toast.success("User banned");
      qc.invalidateQueries({ queryKey: QK.USER_DETAIL(id) });
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const { user } = data;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={user.fullName}
        description={`Joined ${formatDate(user.createdAt)} · Last active ${
          user.lastActiveAt ? relativeTime(user.lastActiveAt) : "never"
        } · ${user.region ?? "—"}`}
        actions={
          <div className="flex items-center gap-2">
            {user.isActive ? (
              <SendPushSheet
                userId={user.id}
                recipientName={user.fullName}
              />
            ) : null}
            {canBanUsers && user.isActive ? (
              <Button
                variant="destructive"
                loading={ban.isPending}
                onClick={() => {
                  if (confirm(`Ban ${user.fullName}? This is reversible.`))
                    ban.mutate();
                }}
              >
                <Ban className="h-4 w-4" /> Ban account
              </Button>
            ) : null}
          </div>
        }
      />

      <Card>
        <CardContent className="flex items-center gap-4 pt-4">
          <Avatar className="h-16 w-16 text-base">
            <AvatarFallback>{initials(user.fullName)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            {user.username ? (
              <span className="font-mono text-sm text-slate-700">
                @{user.username}
              </span>
            ) : (
              <span className="font-mono text-xs text-slate-400">
                no username set
              </span>
            )}
            <div className="flex items-center gap-2 text-slate-500">
              {user.email && (
                <span className="flex items-center gap-1 text-xs">
                  <Mail className="h-3 w-3" /> {user.email}
                </span>
              )}
              {user.phone && (
                <span className="flex items-center gap-1 text-xs">
                  <Phone className="h-3 w-3" /> {user.phone}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">
                {user.role}
              </Badge>
              {user.schoolName && (
                <Badge variant="outline">{user.schoolName}</Badge>
              )}
              {user.formLevel && (
                <Badge variant="outline">Form {user.formLevel}</Badge>
              )}
              {user.isActive ? (
                <Badge variant="success">Active</Badge>
              ) : (
                <Badge variant="destructive">Banned</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Exams completed</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {data.examsCount}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">AI calls</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {data.aiUsage?.calls ?? "0"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">AI cost attributed</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            ${parseFloat(data.aiUsage?.cost ?? "0").toFixed(2)}
          </CardContent>
        </Card>
      </div>

      <UserEntitlementsSection userId={id} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Exam history</CardTitle>
          <span className="text-xs text-slate-500">
            {exams ? `${formatNumber(exams.total)} total` : ""}
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Started</TableHead>
                <TableHead>Exam</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="text-right">Accuracy</TableHead>
                <TableHead className="text-right">Minutes</TableHead>
                <TableHead className="text-right">XP</TableHead>
                <TableHead className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {exams === undefined && (
                <TableRow>
                  <TableCell colSpan={9}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                </TableRow>
              )}
              {exams && exams.items.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="py-8 text-center text-slate-500"
                  >
                    No exams taken yet.
                  </TableCell>
                </TableRow>
              )}
              {exams?.items.map((e) => {
                const scoreLabel =
                  e.score != null && e.totalQuestions != null
                    ? `${e.score} / ${e.totalQuestions}`
                    : e.percentScore != null
                      ? `${parseFloat(e.percentScore).toFixed(1)}%`
                      : "—";
                return (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs text-slate-500">
                      {formatDateTime(e.startedAt)}
                    </TableCell>
                    <TableCell>
                      <ExamTypeBadge value={e.examType} />
                    </TableCell>
                    <TableCell className="text-xs capitalize text-slate-600">
                      {e.mode.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          e.status === "completed"
                            ? "success"
                            : e.status === "in_progress"
                              ? "outline"
                              : "warning"
                        }
                        className="capitalize"
                      >
                        {e.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {scoreLabel}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {e.answeredCount > 0 ? `${e.accuracy}%` : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {e.minutesSpent ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm font-medium text-amber-700">
                      {formatNumber(e.xpEarned)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/admin/users/${id}/exams/${e.id}`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subscription history</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Cadence</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount (GHS)</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.subscriptions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-slate-500">
                    No subscriptions yet.
                  </TableCell>
                </TableRow>
              )}
              {data.subscriptions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-sm">
                    {s.plan?.name ?? (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs ${billingIntervalTone(s.billingInterval)}`}
                    >
                      {billingIntervalLabel(s.billingInterval)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs ${STATUS_TONE[s.status]}`}
                    >
                      {STATUS_LABEL[s.status]}
                    </span>
                  </TableCell>
                  <TableCell>{formatGHS(s.amountGhs)}</TableCell>
                  <TableCell>{formatDate(s.startsAt)}</TableCell>
                  <TableCell>{formatDate(s.expiresAt)}</TableCell>
                  <TableCell className="font-mono text-[11px] text-slate-500">
                    {s.providerReference ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
