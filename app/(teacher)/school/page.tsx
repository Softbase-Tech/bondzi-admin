import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/** Phase 2 stub — class overview (spec §11.2). */
export default function SchoolOverviewPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold">Class overview</h1>
        <Badge variant="warning">Phase 2</Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming in Phase 2</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-500">
          Teacher-scoped analytics: student count, weekly accuracy, weakest
          topic per class, assignment tracking, and PDF progress reports.
        </CardContent>
      </Card>
    </div>
  );
}
