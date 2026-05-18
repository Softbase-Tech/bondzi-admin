"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { FileText, Upload } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/admin/layout/page-header";

// Sample template — covers the two shapes admins forget:
//   1. paragraph-only row (no examples)
//   2. row with a worked example including caption, steps, and image
const TEMPLATE = `[
  {
    "questionId": "00000000-0000-0000-0000-000000000000",
    "explanation": "The correct answer is B because subtracting 3 from both sides isolates 2x, and dividing by 2 gives x = 4."
  },
  {
    "questionId": "00000000-0000-0000-0000-000000000001",
    "explanation": "Pythagoras' theorem applies because the triangle has a right angle.",
    "explanationExamples": [
      {
        "caption": "Worked example",
        "prompt": "A ladder 5m long leans against a wall. Its base is 3m from the wall. How high does it reach?",
        "solution": "It reaches 4m up the wall.",
        "steps": [
          "Apply a² + b² = c²: 3² + b² = 5²",
          "9 + b² = 25",
          "b² = 16 → b = 4"
        ],
        "imageUrl": null
      }
    ]
  }
]`;

interface ImportReport {
  updated: number;
  errors: { index: number; questionId: string; message: string }[];
}

/**
 * Bulk import explanations for EXISTING questions. Each row targets a
 * question by id and overwrites its explanation + examples. Failures
 * roll back atomically — admins re-run after fixing the file.
 *
 * Distinct from /admin/questions/import:
 *   - That page CREATES questions (and may include explanations inline).
 *   - This page UPDATES the explanation on questions that already exist.
 *
 * Use case: you've imported 500 questions earlier without explanations
 * and now want to bulk-attach reviewed explanations sourced from a
 * curriculum doc / spreadsheet without going through the AI generator.
 */
export default function BulkExplanationsImportPage() {
  const [raw, setRaw] = useState("");
  const [report, setReport] = useState<ImportReport | null>(null);

  const mutation = useMutation({
    mutationFn: async (): Promise<ImportReport> => {
      const parsed = JSON.parse(raw) as unknown[];
      const res = await api.post("/questions/bulk-import-explanations", {
        explanations: parsed,
      });
      return (res.data.data ?? res.data) as ImportReport;
    },
    onSuccess: (data) => {
      setReport(data);
      if (data.updated > 0)
        toast.success(
          `${data.updated} explanation${data.updated > 1 ? "s" : ""} imported`,
        );
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Bulk import explanations"
        description="Paste a JSON array of { questionId, explanation, explanationExamples? } objects. Each row OVERWRITES the explanation on an existing question. All-or-nothing transaction."
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
            placeholder='[{"questionId":"…","explanation":"…","explanationExamples":[{"caption":"Example 1","prompt":"…","solution":"…","steps":["…"],"imageUrl":null}]}]'
            className="font-mono text-xs"
          />
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <strong>Heads up:</strong> this REPLACES the existing
            explanation + examples on each question. Pass an empty{" "}
            <code className="text-[11px]">explanationExamples: []</code> to
            clear examples without changing the paragraph. Manual imports
            stamp{" "}
            <code className="text-[11px]">
              explanation_model=&quot;manual&quot;
            </code>
            .
          </div>
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
            <CardTitle>Import report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              <span className="font-medium text-emerald-700">
                {report.updated}
              </span>{" "}
              updated,{" "}
              <span className="font-medium text-rose-700">
                {report.errors.length}
              </span>{" "}
              errors.
            </div>
            {report.errors.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs">
                {report.errors.map((e) => (
                  <li key={`${e.index}-${e.questionId}`} className="text-rose-700">
                    Row {e.index} ({e.questionId.slice(0, 8)}): {e.message}
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
