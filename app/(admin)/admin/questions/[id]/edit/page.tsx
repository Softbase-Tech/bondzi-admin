"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/admin/layout/page-header";
import { QuestionForm } from "@/components/admin/questions/question-form";
import type { Question } from "@/types/api";

export default function EditQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data, isLoading } = useQuery({
    queryKey: QK.QUESTION_DETAIL(id),
    queryFn: () => unwrap<Question>(api.get(`/questions/${id}`)),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Edit question"
        description="Changes are audit-logged. Flipping isActive to true publishes."
      />
      {isLoading || !data ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <QuestionForm mode="edit" initial={data} />
      )}
    </div>
  );
}
