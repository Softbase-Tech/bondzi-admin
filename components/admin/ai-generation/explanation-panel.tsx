"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Bot, Sparkles } from "lucide-react";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { formatNumber, formatUSD } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExamTypeToggle } from "@/components/admin/shared/exam-type-toggle";
import { ConfirmDialog } from "./confirm-dialog";
import { JobProgressPanel } from "./progress-panel";
import { YearRangeSlider } from "./year-range-slider";
import type {
  ExamType,
  ExplanationPreviewResponse,
  Subject,
} from "@/types/api";

type HasExpl = "missing" | "has" | "all";
type Model = "haiku" | "sonnet";

export function ExplanationPanel() {
  const [examType, setExamType] = useState<ExamType>("wassce");
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [yearFrom, setYearFrom] = useState<number>(2005);
  const [yearTo, setYearTo] = useState<number>(2024);
  const [hasExpl, setHasExpl] = useState<HasExpl>("missing");
  const [model, setModel] = useState<Model>("haiku");

  const [preview, setPreview] = useState<ExplanationPreviewResponse | null>(
    null,
  );
  const [confirming, setConfirming] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);

  const { data: subjects } = useQuery({
    queryKey: QK.SUBJECTS_LIST({ examType }),
    queryFn: () =>
      unwrap<Subject[]>(
        api.get("/subjects", { params: { examType, activeOnly: true } }),
      ),
  });

  const previewMut = useMutation({
    mutationFn: () =>
      unwrap<ExplanationPreviewResponse>(
        api.post("/admin/ai-generation/explanations/preview", {
          examType,
          subjectIds: subjectIds.length ? subjectIds : undefined,
          yearFrom,
          yearTo,
          hasExplanation:
            hasExpl === "all" ? undefined : hasExpl === "has" ? true : false,
          model,
        }),
      ),
    onSuccess: (data) => {
      setPreview(data);
      toast.success(`${formatNumber(data.totalQuestions)} questions selected`);
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Preview failed"),
  });

  const generateMut = useMutation({
    mutationFn: () =>
      unwrap<{ jobId: string }>(
        api.post("/admin/ai-generation/explanations", {
          token: preview!.token,
        }),
      ),
    onSuccess: (data) => {
      setJobId(data.jobId);
      setConfirming(false);
      toast.success("Job queued");
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Failed to start job"),
  });

  const toggleSubject = (id: string) => {
    setSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
    setPreview(null);
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-4 w-4" /> Explanation generation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>Exam type</Label>
          <ExamTypeToggle
            value={examType}
            onChange={(v) => {
              setExamType(v);
              setSubjectIds([]);
              setPreview(null);
            }}
          />
        </div>

        <div className="space-y-2">
          <Label>Subjects</Label>
          <div className="flex flex-wrap gap-1.5 rounded-md border border-slate-200 p-2 min-h-[60px] bg-slate-50">
            {subjects?.length === 0 && (
              <span className="text-xs text-slate-400">No subjects found.</span>
            )}
            {subjects?.map((s) => {
              const on = subjectIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSubject(s.id)}
                  className={
                    on
                      ? "rounded border border-primary bg-primary px-2 py-1 text-xs font-medium text-white"
                      : "rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:border-slate-300"
                  }
                >
                  {s.name}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-500">
            Empty = all subjects for the selected exam type.
          </p>
        </div>

        <div className="space-y-1">
          <Label>Year range</Label>
          <YearRangeSlider
            min={2005}
            max={2024}
            from={yearFrom}
            to={yearTo}
            onChange={(f, t) => {
              setYearFrom(f);
              setYearTo(t);
              setPreview(null);
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Has explanation</Label>
            <Select
              value={hasExpl}
              onValueChange={(v) => {
                setHasExpl(v as HasExpl);
                setPreview(null);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="missing">Missing only</SelectItem>
                <SelectItem value="has">Has explanation</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Model</Label>
            <Select
              value={model}
              onValueChange={(v) => {
                setModel(v as Model);
                setPreview(null);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="haiku">Claude Haiku (fast, cheap)</SelectItem>
                <SelectItem value="sonnet">
                  Claude Sonnet (higher quality)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-slate-100 pt-4">
          <Button
            variant="outline"
            onClick={() => previewMut.mutate()}
            loading={previewMut.isPending}
          >
            Preview cost
          </Button>
          <Button
            disabled={!preview}
            onClick={() => setConfirming(true)}
          >
            <Sparkles className="h-4 w-4" />
            {preview
              ? `Generate for ${formatNumber(preview.totalQuestions)} questions`
              : "Generate"}
          </Button>
        </div>

        {preview && (
          <div className="rounded-md border border-primary/30 bg-accent p-3 text-sm space-y-1">
            <div className="font-medium text-primary-deep">Preview</div>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">
                {formatNumber(preview.totalQuestions)} questions
              </Badge>
              <Badge variant="outline">
                Cost ~ {formatUSD(preview.estimatedCostUsd)}
              </Badge>
              <Badge variant="outline">
                ETA ~{preview.estimatedMinutes}m
              </Badge>
              <Badge variant="outline">Model: {preview.model}</Badge>
            </div>
          </div>
        )}

        {jobId && <JobProgressPanel jobId={jobId} />}
      </CardContent>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Start explanation generation?"
        description={`This will generate explanations for ${formatNumber(preview?.totalQuestions ?? 0)} questions. Estimated cost ${formatUSD(preview?.estimatedCostUsd ?? 0)}. Type GENERATE to proceed.`}
        onConfirm={() => generateMut.mutate()}
        busy={generateMut.isPending}
      />
    </Card>
  );
}
