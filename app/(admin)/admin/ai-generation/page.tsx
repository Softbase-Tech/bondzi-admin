import { PageHeader } from "@/components/admin/layout/page-header";
import { ExplanationPanel } from "@/components/admin/ai-generation/explanation-panel";
import { PmTestPanel } from "@/components/admin/ai-generation/pm-test-panel";
import { GenerationHistory } from "@/components/admin/ai-generation/generation-history";
import { PendingApprovalPanel } from "@/components/admin/ai-generation/pending-approval";
import { CalibrationPanel } from "@/components/admin/ai-generation/calibration-panel";

export default function AiGenerationPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="AI Generation"
        description="Bulk explanation generation and Bondzi Test question generation. Admin-triggered, cost-gated, live-streamed progress."
      />
      {/* Co-sign queue first — anything sitting here is blocking real
          work until a second admin acts. */}
      <PendingApprovalPanel />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ExplanationPanel />
        <PmTestPanel />
      </div>
      <GenerationHistory />
      <CalibrationPanel />
    </div>
  );
}
