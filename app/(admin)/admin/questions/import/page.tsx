"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Upload, FileText } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/admin/layout/page-header";

// Sample template — kept short but exercises the two interesting axes
// admins forget about: (1) `explanation` is optional + carries
// markdown, (2) `explanationExamples` is an array of worked-example
// blocks that REPLACE any existing examples on the row.
const TEMPLATE = `[
  {
    "subjectId": "00000000-0000-0000-0000-000000000000",
    "topicId": null,
    "examType": "wassce",
    "questionType": "mcq",
    "source": "wassce_past",
    "body": "Solve for x: 2x + 3 = 11",
    "year": 2023,
    "difficulty": "easy",
    "tags": ["algebra"],
    "options": [
      { "label": "A", "body": "x = 3", "isCorrect": false },
      { "label": "B", "body": "x = 4", "isCorrect": true },
      { "label": "C", "body": "x = 5", "isCorrect": false },
      { "label": "D", "body": "x = 6", "isCorrect": false, "imageUrl": "https://… (optional, for image-as-choice questions)" }
    ],
    "explanation": "Subtract 3 from both sides, then divide by 2.",
    "explanationExamples": [
      {
        "caption": "Example 1",
        "prompt": "Solve 3y + 6 = 21",
        "solution": "y = 5",
        "steps": [
          "Subtract 6 from both sides: 3y = 15",
          "Divide both sides by 3: y = 5"
        ]
      }
    ]
  }
]`;

interface ImportReport {
  created: number;
  errors: { index: number; message: string }[];
}

/**
 * Bulk import wizard (§6.3). Minimal: paste a JSON array, hit submit,
 * backend validates all-or-nothing and returns an error report.
 *
 * `explanation` and `explanationExamples` are OPTIONAL — questions
 * imported without them work exactly as before. Including them stamps
 * `explanation_model='manual'` on the row so admin AI dashboards can
 * distinguish manual entries from AI-generated ones.
 */
export default function BulkImportPage() {
  const [raw, setRaw] = useState("");
  const [report, setReport] = useState<ImportReport | null>(null);

  const mutation = useMutation({
    mutationFn: async (): Promise<ImportReport> => {
      const parsed = JSON.parse(raw) as unknown[];
      const res = await api.post("/questions/bulk-import", {
        questions: parsed,
      });
      return (res.data.data ?? res.data) as ImportReport;
    },
    onSuccess: (data) => {
      setReport(data);
      if (data.created > 0)
        toast.success(
          `${data.created} question${data.created > 1 ? "s" : ""} imported`,
        );
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Bulk import questions"
        description="Paste a JSON array of questions. The backend validates all rows before inserting any. Optional explanation + worked-example fields are supported per row."
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>JSON payload</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRaw(TEMPLATE)}
            disabled={mutation.isPending}
          >
            <FileText className="h-3.5 w-3.5" /> Load sample
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Textarea
            rows={20}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder='[{"subjectId":"…","examType":"wassce","questionType":"mcq","source":"wassce_past","body":"…","difficulty":"medium","options":[…],"explanation":"… (optional)","explanationExamples":[…]}]'
            className="font-mono text-xs"
          />
          <p className="text-xs text-slate-500">
            <strong>explanation</strong> and{" "}
            <strong>explanationExamples</strong> are optional. Each
            example is{" "}
            <code className="text-[11px]">
              {"{ caption?, prompt, solution, steps?, imageUrl? }"}
            </code>
            . Manual imports stamp{" "}
            <code className="text-[11px]">explanation_model=&quot;manual&quot;</code>
            .
          </p>
          <div className="flex justify-end">
            <Button
              onClick={() => mutation.mutate()}
              loading={mutation.isPending}
              disabled={!raw.trim()}
            >
              <Upload className="h-4 w-4" /> Upload
            </Button>
          </div>
        </CardContent>
      </Card>

      {report && (
        <Card>
          <CardHeader>
            <CardTitle>Validation report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              <span className="font-medium text-emerald-700">
                {report.created}
              </span>{" "}
              created,{" "}
              <span className="font-medium text-rose-700">
                {report.errors.length}
              </span>{" "}
              errors.
            </div>
            {report.errors.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs">
                {report.errors.map((e) => (
                  <li key={e.index} className="text-rose-700">
                    Row {e.index}: {e.message}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
