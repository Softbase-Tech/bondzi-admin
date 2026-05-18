"use client";

import { QuestionForm } from "@/components/admin/questions/question-form";
import { PageHeader } from "@/components/admin/layout/page-header";

export default function NewQuestionPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="New question"
        description="Draft publishes as isActive=false by default. Flip to publish when reviewed."
      />
      <QuestionForm mode="create" />
    </div>
  );
}
