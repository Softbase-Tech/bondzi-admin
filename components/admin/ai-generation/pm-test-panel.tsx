"use client";

import { Fragment, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ChevronDown, ChevronRight, Sparkles, Wand2 } from "lucide-react";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { formatNumber, formatUSD } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExamTypeToggle } from "@/components/admin/shared/exam-type-toggle";
import { ConfirmDialog } from "./confirm-dialog";
import { JobProgressPanel } from "./progress-panel";
import { DifficultyMixSliders } from "./difficulty-mix-sliders";
import type {
  ExamType,
  PmTestPreviewResponse,
  Subject,
  SyllabusTopic,
} from "@/types/api";

type Model = "haiku" | "sonnet";
type Mode = "append" | "replace";

interface RowState {
  enabled: boolean;
  expanded: boolean;
  count: number;
  mix: { easy: number; medium: number; hard: number };
  mode: Mode;
  syllabusTopicIds: string[];
}

const DEFAULT_MIX = { easy: 30, medium: 50, hard: 20 };

const FORM_LEVELS: Record<ExamType, number[]> = {
  bece: [1, 2, 3],
  wassce: [1, 2, 3],
};

export function PmTestPanel() {
  const [examType, setExamType] = useState<ExamType>("wassce");
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [model, setModel] = useState<Model>("haiku");
  const [includeExplanations, setIncludeExplanations] = useState(true);
  const [preview, setPreview] = useState<PmTestPreviewResponse | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);

  const { data: subjects } = useQuery({
    queryKey: QK.SUBJECTS_LIST({ examType }),
    queryFn: () =>
      unwrap<Subject[]>(
        api.get("/subjects", { params: { examType, activeOnly: true } }),
      ),
  });

  const matrix = useMemo(() => {
    const out: Array<{ formLevel: number; subject: Subject }> = [];
    for (const fl of FORM_LEVELS[examType]) {
      for (const s of subjects ?? []) {
        out.push({ formLevel: fl, subject: s });
      }
    }
    return out;
  }, [examType, subjects]);

  const key = (fl: number, sid: string) => `${fl}:${sid}`;

  const updateRow = (k: string, patch: Partial<RowState>) => {
    const defaults: RowState = {
      enabled: false,
      expanded: false,
      count: 100,
      mix: DEFAULT_MIX,
      mode: "append",
      syllabusTopicIds: [],
    };
    setRows((prev) => ({
      ...prev,
      [k]: { ...defaults, ...prev[k], ...patch },
    }));
    setPreview(null);
  };

  const previewMut = useMutation({
    mutationFn: () => {
      const enabled = matrix
        .map((m) => ({ key: key(m.formLevel, m.subject.id), m }))
        .filter(({ key: k }) => rows[k]?.enabled);
      if (enabled.length === 0) {
        throw { message: "Select at least one (level, subject)." };
      }
      const body = {
        examType,
        model,
        includeExplanations,
        rows: enabled.map(({ key: k, m }) => ({
          examType,
          formLevel: m.formLevel,
          subjectId: m.subject.id,
          questionCount: rows[k]?.count ?? 100,
          difficultyMix: rows[k]?.mix ?? DEFAULT_MIX,
          mode: rows[k]?.mode ?? "append",
          syllabusTopicIds: rows[k]?.syllabusTopicIds?.length
            ? rows[k]?.syllabusTopicIds
            : undefined,
        })),
      };
      return unwrap<PmTestPreviewResponse>(
        api.post("/admin/ai-generation/pm-test/preview", body),
      );
    },
    onSuccess: (data) => {
      setPreview(data);
      toast.success(
        `${formatNumber(data.totalQuestions)} questions — preview ready`,
      );
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Preview failed"),
  });

  const generateMut = useMutation({
    mutationFn: () =>
      unwrap<{ jobId: string }>(
        api.post("/admin/ai-generation/pm-test", { token: preview!.token }),
      ),
    onSuccess: (data) => {
      setJobId(data.jobId);
      setConfirming(false);
      toast.success("PM Test generation queued");
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Failed to start job"),
  });

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-4 w-4" /> Bondzi Test generation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Exam type</Label>
          <ExamTypeToggle
            value={examType}
            onChange={(v) => {
              setExamType(v);
              setRows({});
              setPreview(null);
            }}
          />
        </div>

        <div className="rounded-md border border-slate-200 max-h-96 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="w-28">Count</TableHead>
                <TableHead className="w-40">
                  Mix (E/M/H — expand to adjust)
                </TableHead>
                <TableHead className="w-24">Mode</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matrix.map(({ formLevel, subject }) => {
                const k = key(formLevel, subject.id);
                const r = rows[k];
                return (
                  <Fragment key={k}>
                    <TableRow className={r?.enabled ? "bg-accent/30" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={r?.enabled ?? false}
                          onCheckedChange={(v) =>
                            updateRow(k, { enabled: Boolean(v) })
                          }
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        F{formLevel}
                      </TableCell>
                      <TableCell className="text-sm">
                        <button
                          type="button"
                          onClick={() =>
                            updateRow(k, { expanded: !r?.expanded })
                          }
                          disabled={!r?.enabled}
                          className="inline-flex items-center gap-1 hover:text-primary disabled:opacity-50"
                        >
                          {r?.expanded ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                          {subject.name}
                          {r?.syllabusTopicIds?.length ? (
                            <span className="ml-1 rounded-sm bg-accent px-1 text-[10px] text-primary-deep">
                              {r.syllabusTopicIds.length} topics
                            </span>
                          ) : null}
                        </button>
                      </TableCell>
                      <TableCell>
                        <input
                          type="number"
                          aria-label={`Question count for F${formLevel} ${subject.name}`}
                          min={100}
                          max={50000}
                          step={100}
                          value={r?.count ?? 100}
                          disabled={!r?.enabled}
                          onChange={(e) =>
                            updateRow(k, { count: Number(e.target.value) })
                          }
                          className="h-8 w-full rounded-md border border-slate-200 px-2 text-sm disabled:bg-slate-50"
                        />
                      </TableCell>
                      <TableCell>
                        {r?.enabled ? (
                          <div className="flex items-center gap-2">
                            <div className="flex h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="bg-emerald-500"
                                style={{ width: `${r.mix.easy}%` }}
                              />
                              <div
                                className="bg-amber-500"
                                style={{ width: `${r.mix.medium}%` }}
                              />
                              <div
                                className="bg-rose-500"
                                style={{ width: `${r.mix.hard}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-slate-600 tabular-nums">
                              {r.mix.easy}/{r.mix.medium}/{r.mix.hard}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={r?.mode ?? "append"}
                          onValueChange={(v) =>
                            updateRow(k, { mode: v as Mode })
                          }
                          disabled={!r?.enabled}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="append">Append</SelectItem>
                            <SelectItem value="replace">Replace</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                    {r?.enabled && r.expanded && (
                      <TableRow className="bg-slate-50/70">
                        <TableCell colSpan={6} className="px-4 py-3">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div>
                              <div className="mb-2 text-xs font-medium text-slate-600">
                                Difficulty mix
                              </div>
                              <DifficultyMixSliders
                                value={r.mix}
                                onChange={(mix) => updateRow(k, { mix })}
                              />
                            </div>
                            <SyllabusTopicPicker
                              examType={examType}
                              subjectId={subject.id}
                              formLevel={formLevel}
                              selectedIds={r.syllabusTopicIds}
                              onChange={(ids) =>
                                updateRow(k, { syllabusTopicIds: ids })
                              }
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Model</Label>
            <Select value={model} onValueChange={(v) => setModel(v as Model)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="haiku">Claude Haiku</SelectItem>
                <SelectItem value="sonnet">Claude Sonnet</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="pm-expl">Include explanations</Label>
              <p className="text-[11px] text-slate-500">+~30% cost</p>
            </div>
            <Switch
              id="pm-expl"
              checked={includeExplanations}
              onCheckedChange={setIncludeExplanations}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
          <Button
            variant="outline"
            onClick={() => previewMut.mutate()}
            loading={previewMut.isPending}
          >
            Preview cost
          </Button>
          <Button disabled={!preview} onClick={() => setConfirming(true)}>
            <Sparkles className="h-4 w-4" />
            {preview
              ? `Generate ${formatNumber(preview.totalQuestions)} questions`
              : "Generate"}
          </Button>
        </div>

        {preview && (
          <div className="rounded-md border border-primary/30 bg-accent p-3 text-sm space-y-2">
            <div className="font-medium text-primary-deep">Preview</div>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">
                {formatNumber(preview.totalQuestions)} questions
              </Badge>
              <Badge variant="outline">
                Cost ~ {formatUSD(preview.estimatedCostUsd)}
              </Badge>
              <Badge variant="outline">ETA ~{preview.estimatedMinutes}m</Badge>
              <Badge variant="outline">Model: {preview.model}</Badge>
            </div>
            <details className="text-xs">
              <summary className="cursor-pointer text-primary-deep">
                Breakdown
              </summary>
              <ul className="mt-1 space-y-0.5 text-slate-700">
                {preview.breakdown.map((b) => (
                  <li key={`${b.examType}-${b.formLevel}-${b.subjectId}`}>
                    F{b.formLevel} · {b.subjectName} ·{" "}
                    {formatNumber(b.questionCount)} q ·{" "}
                    {formatUSD(b.estimatedCostUsd)}
                  </li>
                ))}
              </ul>
            </details>
          </div>
        )}

        {jobId && <JobProgressPanel jobId={jobId} />}
      </CardContent>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Start PM Test generation?"
        description={`This will generate ${formatNumber(preview?.totalQuestions ?? 0)} questions (cost ~ ${formatUSD(preview?.estimatedCostUsd ?? 0)}). They'll land in pending_review for admin approval.`}
        onConfirm={() => generateMut.mutate()}
        busy={generateMut.isPending}
      />
    </Card>
  );
}

function SyllabusTopicPicker({
  examType,
  subjectId,
  formLevel,
  selectedIds,
  onChange,
}: {
  examType: ExamType;
  subjectId: string;
  formLevel: number;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: QK.SYLLABUS_TOPICS({ examType, subjectId, formLevel }),
    queryFn: () =>
      unwrap<SyllabusTopic[]>(
        api.get("/syllabus-topics", {
          params: { examType, subjectId, formLevel },
        }),
      ),
  });

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    );
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="text-slate-600">
          Restrict to specific syllabus topics{" "}
          <span className="text-slate-400">(optional)</span>
        </span>
        {selectedIds.length > 0 && (
          <button
            type="button"
            className="text-primary-deep hover:text-primary"
            onClick={() => onChange([])}
          >
            Clear ({selectedIds.length})
          </button>
        )}
      </div>
      {isLoading ? (
        <div className="text-xs text-slate-500">Loading topics…</div>
      ) : (data?.length ?? 0) === 0 ? (
        <div className="text-xs text-slate-500">
          No syllabus topics defined for F{formLevel} of this subject — will
          generate freely.
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {data!.map((t) => {
            const on = selectedIds.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => toggle(t.id)}
                className={
                  on
                    ? "rounded border border-primary bg-primary px-2 py-1 text-xs font-medium text-white"
                    : "rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:border-slate-300"
                }
              >
                {t.title}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
