"use client";

import { GraduationCap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/admin/layout/page-header";

/**
 * Schools management is Phase 2 (spec §10.1). The tables exist in the backend
 * migration so the admin can land the UI without a schema change — keep this
 * page as a placeholder until the first school contract closes.
 */
export default function SchoolsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Schools"
        description="B2B licensing. Ships in Phase 2 when the first school contract closes."
        actions={<Badge variant="warning">Phase 2</Badge>}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Not yet shipped
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-500">
          Schools, student caps, and teacher portal access will surface here.
          The backend already carries `schools` and `school_members` tables, so
          the admin can add the CRUD flow without any migrations.
        </CardContent>
      </Card>
    </div>
  );
}
