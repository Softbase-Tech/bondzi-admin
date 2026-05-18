import { PageHeader } from "@/components/admin/layout/page-header";
import { PmTestPanel } from "@/components/admin/ai-generation/pm-test-panel";
import { GenerationHistory } from "@/components/admin/ai-generation/generation-history";

export default function PmTestGeneratePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Bondzi Test — Generate questions"
        description="AI-driven question generation with per-level × subject control. Output lands in pending_review."
      />
      <PmTestPanel />
      <GenerationHistory />
    </div>
  );
}
