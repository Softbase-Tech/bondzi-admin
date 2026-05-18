"use client";

import { use } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ArrowLeft, Check, Pencil, Trash2 } from "lucide-react";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { usePermissions } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/admin/layout/page-header";
import {
  DifficultyBadge,
  VerifiedBadge,
} from "@/components/admin/questions/difficulty-badge";
import { MathPreview } from "@/components/admin/questions/math-preview";
import { formatDate, percent } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Question } from "@/types/api";

export default function QuestionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { canEditQuestions, canDeleteQuestions } = usePermissions();
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: QK.QUESTION_DETAIL(id),
    queryFn: () => unwrap<Question>(api.get(`/questions/${id}`)),
  });

  const del = useMutation({
    mutationFn: () => api.delete(`/questions/${id}`),
    onSuccess: () => {
      toast.success("Question deleted");
      qc.invalidateQueries({ queryKey: ["questions"] });
      window.location.href = "/admin/questions";
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Question not found"
          description="The ID is invalid or the question was deleted."
          actions={
            <Button asChild variant="outline">
              <Link href="/admin/questions">
                <ArrowLeft className="h-4 w-4" /> Back to list
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const correctLabel = data.options.find((o) => o.isCorrect)?.label ?? "—";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Question detail"
        description={`Created ${formatDate(data.createdAt)} · Last updated ${formatDate(data.updatedAt)}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/admin/questions">
                <ArrowLeft className="h-4 w-4" /> Back
              </Link>
            </Button>
            {canEditQuestions && (
              <Button asChild>
                <Link href={`/admin/questions/${id}/edit`}>
                  <Pencil className="h-4 w-4" /> Edit
                </Link>
              </Button>
            )}
            {canDeleteQuestions && (
              <Button
                variant="destructive"
                loading={del.isPending}
                onClick={() => {
                  if (
                    confirm(
                      "Delete this question? This is a soft-delete — it can be restored.",
                    )
                  )
                    del.mutate();
                }}
              >
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Question body</CardTitle>
          </CardHeader>
          <CardContent>
            {data.stimulus ? (
              <div className="mb-4 rounded-md border border-sky-200 bg-sky-50 p-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-sm border border-sky-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-800">
                    Shared stimulus
                  </span>
                  {data.stimulus.title && (
                    <span className="text-xs text-slate-600">
                      {data.stimulus.title}
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <MathPreview source={data.stimulus.body} />
                </div>
                {data.stimulus.imageUrl && (
                  <img
                    src={data.stimulus.imageUrl}
                    alt=""
                    className="mt-3 max-h-48 rounded-md border border-slate-200 object-contain"
                  />
                )}
              </div>
            ) : null}
            <MathPreview source={data.body} />
            {data.imageUrl && (
              <img
                src={data.imageUrl}
                alt=""
                className="mt-4 max-h-64 rounded-md border border-slate-200 object-contain"
              />
            )}
            <div className="mt-6 flex flex-col gap-2">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Options
              </div>
              {data.options
                .slice()
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((o) => (
                  <div
                    key={o.id}
                    className={cn(
                      "flex items-start gap-3 rounded-md border px-3 py-2",
                      o.isCorrect
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-slate-200 bg-white",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        o.isCorrect
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-200 text-slate-700",
                      )}
                    >
                      {o.isCorrect ? <Check className="h-3 w-3" /> : o.label}
                    </span>
                    <div className="flex-1 text-sm">
                      <MathPreview source={o.body} compact />
                      {o.imageUrl && (
                        <img
                          src={o.imageUrl}
                          alt=""
                          className="mt-2 max-h-32 rounded border border-slate-200 object-contain"
                        />
                      )}
                    </div>
                  </div>
                ))}
              <div className="mt-2 text-xs text-slate-500">
                Correct answer: <span className="font-medium">{correctLabel}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <Row label="Subject">
              {data.subject?.name ?? data.subjectId.slice(0, 8)}
            </Row>
            <Row label="Topic">
              {data.topic?.title ?? (data.topicId ? data.topicId.slice(0, 8) : "—")}
            </Row>
            <Row label="Type">
              <Badge variant="outline" className="capitalize">
                {data.questionType.replace("_", " ")}
              </Badge>
            </Row>
            <Row label="Difficulty">
              <DifficultyBadge value={data.difficulty} />
            </Row>
            <Row label="Source">
              <span className="text-slate-700 capitalize">
                {data.source.replace(/_/g, " ")}
              </span>
            </Row>
            <Row label="Year">{data.year ?? "—"}</Row>
            <Row label="Paper">{data.wassecPaper ?? "—"}</Row>
            <Row label="Section">{data.section ?? "—"}</Row>
            <Row label="Verified">
              <VerifiedBadge verified={data.isVerified} />
            </Row>
            <Row label="Status">
              {data.status === "active" ? (
                <Badge variant="success">Live</Badge>
              ) : (
                <Badge variant="outline" className="capitalize">
                  {data.status.replace("_", " ")}
                </Badge>
              )}
            </Row>
            <Row label="Flags">
              {data.flagCount > 0 ? (
                <span className="font-medium text-rose-600">
                  {data.flagCount}
                </span>
              ) : (
                <span className="text-slate-400">0</span>
              )}
            </Row>
            <Row label="Answered">{data.timesAnswered}</Row>
            <Row label="Accuracy">
              {percent(data.timesCorrect, data.timesAnswered)}
            </Row>
            {data.tags.length > 0 && (
              <div className="pt-2">
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Tags
                </div>
                <div className="flex flex-wrap gap-1">
                  {data.tags.map((t) => (
                    <Badge key={t} variant="outline">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <span className="text-right">{children}</span>
    </div>
  );
}
