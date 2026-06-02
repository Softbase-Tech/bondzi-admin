"use client";

import "katex/dist/katex.min.css";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import {
  createQuestionSchema,
  type QuestionFormData,
} from "@/lib/validators/question";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MathEditor } from "./math-editor";
import { StimulusPicker } from "@/components/admin/stimuli/stimulus-picker";
import type { Question, Subject, Topic } from "@/types/api";

interface Props {
  mode: "create" | "edit";
  initial?: Question;
}

export function QuestionForm({ mode, initial }: Props) {
  const router = useRouter();
  const qc = useQueryClient();

  const { data: subjects } = useQuery({
    queryKey: QK.SUBJECTS_LIST(),
    queryFn: () => unwrap<Subject[]>(api.get("/subjects")),
  });

  const form = useForm<QuestionFormData>({
    resolver: zodResolver(createQuestionSchema),
    defaultValues: initial
      ? {
          subjectId: initial.subjectId,
          topicId: initial.topicId ?? undefined,
          stimulusId: initial.stimulusId ?? null,
          // NOVDEC isn't a valid question-level value — NOVDEC users
          // share the WASSCE pool, so no question row carries the
          // `novdec` tag. The widened `ExamType` includes it for user /
          // subscription paths, hence the runtime-defensive narrowing.
          examType:
            initial.examType === "novdec" ? "wassce" : initial.examType,
          questionType: initial.questionType,
          source: initial.source,
          body: initial.body,
          imageUrl: initial.imageUrl ?? "",
          year: initial.year ?? undefined,
          wassecPaper: initial.wassecPaper ?? undefined,
          section: initial.section ?? undefined,
          difficulty: initial.difficulty,
          tags: initial.tags,
          options: initial.options.map((o) => ({
            label: o.label,
            body: o.body,
            imageUrl: o.imageUrl ?? "",
            isCorrect: !!o.isCorrect,
            sortOrder: o.sortOrder,
          })),
        }
      : {
          subjectId: "",
          stimulusId: null,
          examType: "wassce",
          questionType: "mcq",
          source: "wassce_past",
          body: "",
          difficulty: "medium",
          tags: [],
          options: [
            { label: "A", body: "", isCorrect: false },
            { label: "B", body: "", isCorrect: false },
            { label: "C", body: "", isCorrect: false },
            { label: "D", body: "", isCorrect: false },
          ],
        },
  });

  const options = useFieldArray({ control: form.control, name: "options" });

  // Topics are scoped to a subject (which is itself scoped to an exam type),
  // so the cascade is exam type → subject → topic. We only fetch once a
  // subject is picked; before that the topic select shows an empty/disabled
  // state with a hint to pick a subject first.
  const subjectId = form.watch("subjectId");
  const { data: topics } = useQuery({
    queryKey: QK.SUBJECT_TOPICS(subjectId || ""),
    queryFn: () => unwrap<Topic[]>(api.get(`/subjects/${subjectId}/topics`)),
    enabled: !!subjectId,
  });

  const mutation = useMutation({
    mutationFn: (data: QuestionFormData) => {
      if (mode === "edit" && initial) {
        // examType is intentionally not patchable on the backend — switching
        // a question's exam platform would move it into the wrong pool.
        const patch = {
          subjectId: data.subjectId,
          topicId: data.topicId,
          // stimulusId is tri-state on the backend: undefined = no change,
          // null = detach, uuid = attach. We always send the resolved value
          // so the form is the source of truth.
          stimulusId: data.stimulusId ?? null,
          questionType: data.questionType,
          source: data.source,
          body: data.body,
          imageUrl: data.imageUrl,
          year: data.year,
          wassecPaper: data.wassecPaper,
          section: data.section,
          difficulty: data.difficulty,
          tags: data.tags,
          options: data.options,
        };
        return api.patch(`/questions/${initial.id}`, patch);
      }
      return api.post("/questions", data);
    },
    onSuccess: () => {
      toast.success(mode === "edit" ? "Question updated" : "Question created");
      qc.invalidateQueries({ queryKey: ["questions"] });
      router.push("/admin/questions");
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  return (
    <form
      onSubmit={form.handleSubmit((d) => mutation.mutate(d))}
      className="grid grid-cols-1 lg:grid-cols-5 gap-6"
    >
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Question body</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="body">Question (Markdown + LaTeX math)</Label>
            <MathEditor
              id="body"
              value={form.watch("body") ?? ""}
              onChange={(v) =>
                form.setValue("body", v, { shouldValidate: true })
              }
              rows={6}
              placeholder="State the full question as students will see it. Wrap math in $…$ — e.g. Simplify $\dfrac{5^7 \times 5^4}{5^2}$"
            />
            {form.formState.errors.body && (
              <p className="text-xs text-rose-600">
                {form.formState.errors.body.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Options</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  options.append({
                    label: String.fromCharCode(65 + options.fields.length),
                    body: "",
                    imageUrl: "",
                    isCorrect: false,
                  })
                }
              >
                <Plus className="h-3 w-3" /> Add
              </Button>
            </div>
            {options.fields.map((field, i) => (
              <div
                key={field.id}
                className="flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 p-2"
              >
                <div className="flex items-center gap-2">
                  <Input
                    className="w-12 text-center uppercase"
                    maxLength={2}
                    {...form.register(`options.${i}.label`)}
                  />
                  <label className="flex items-center gap-1 whitespace-nowrap text-xs text-slate-600">
                    <Checkbox
                      checked={form.watch(`options.${i}.isCorrect`)}
                      onCheckedChange={(v) =>
                        form.setValue(`options.${i}.isCorrect`, v === true, {
                          shouldValidate: true,
                        })
                      }
                    />
                    Correct
                  </label>
                  <div className="flex-1" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => options.remove(i)}
                    className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    aria-label={`Remove option ${field.label}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {/* Options often need math too (e.g. `5^7`, `5^8`). The
                    compact editor strips the toolbar but keeps the live
                    preview so admins can verify the rendering. */}
                <MathEditor
                  compact
                  value={form.watch(`options.${i}.body`) ?? ""}
                  onChange={(v) =>
                    form.setValue(`options.${i}.body`, v, {
                      shouldValidate: true,
                    })
                  }
                  placeholder={`Option ${i + 1} body — wrap math in $…$`}
                />
                {/* Image options — used for visual-recognition past papers
                    where the choices are shapes / diagrams / pictures.
                    Optional: leave blank for plain text options. */}
                <div className="flex items-start gap-2">
                  <Input
                    placeholder="Optional image URL (https://…)"
                    {...form.register(`options.${i}.imageUrl`)}
                    className="flex-1"
                  />
                  {form.watch(`options.${i}.imageUrl`) ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={form.watch(`options.${i}.imageUrl`) || ""}
                      alt={`Option ${field.label} preview`}
                      className="h-10 w-10 rounded border border-slate-200 object-contain bg-white"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.visibility =
                          "hidden";
                      }}
                    />
                  ) : null}
                </div>
              </div>
            ))}
            {form.formState.errors.options?.message && (
              <p className="text-xs text-rose-600">
                {form.formState.errors.options.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Metadata</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Exam type</Label>
            <Select
              value={form.watch("examType")}
              onValueChange={(v: "bece" | "wassce") => {
                form.setValue("examType", v);
                // Subjects are scoped per exam type — a BECE subject id is
                // invalid the moment exam type flips to WASSCE. Clear the
                // current pick so the admin must reselect from the now-
                // filtered list rather than submit a cross-exam combo.
                // Topic is scoped to subject, so clearing subject also
                // invalidates the topic.
                const current = form.getValues("subjectId");
                const stillValid = (subjects ?? []).some(
                  (s) => s.id === current && s.examType === v,
                );
                if (!stillValid) {
                  form.setValue("subjectId", "", { shouldValidate: true });
                  form.setValue("topicId", "", { shouldValidate: true });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bece">BECE</SelectItem>
                <SelectItem value="wassce">WASSCE</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Subject</Label>
            <Select
              value={form.watch("subjectId")}
              onValueChange={(v) => {
                form.setValue("subjectId", v, { shouldValidate: true });
                // Topic belongs to the previous subject — clear so we don't
                // POST a topicId that no longer corresponds to subjectId.
                form.setValue("topicId", "", { shouldValidate: true });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pick a subject" />
              </SelectTrigger>
              <SelectContent>
                {(subjects ?? [])
                  .filter((s) => s.examType === form.watch("examType"))
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Topic</Label>
            <div className="flex items-center gap-2">
              <Select
                value={form.watch("topicId") || ""}
                onValueChange={(v) =>
                  form.setValue("topicId", v, { shouldValidate: true })
                }
                disabled={!subjectId}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue
                    placeholder={
                      !subjectId
                        ? "Pick a subject first"
                        : (topics?.length ?? 0) === 0
                          ? "No topics for this subject"
                          : "Pick a topic (optional)"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {(topics ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.watch("topicId") ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    form.setValue("topicId", "", { shouldValidate: true })
                  }
                >
                  Clear
                </Button>
              ) : null}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Difficulty</Label>
              <Select
                value={form.watch("difficulty")}
                onValueChange={(v: "easy" | "medium" | "hard") =>
                  form.setValue("difficulty", v)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Source</Label>
              <Select
                value={form.watch("source")}
                onValueChange={(v: QuestionFormData["source"]) =>
                  form.setValue("source", v)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wassce_past">WASSCE past</SelectItem>
                  <SelectItem value="bece_past">BECE past</SelectItem>
                  <SelectItem value="ai_passmaster_test">
                    AI — Bondzi Test
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Year</Label>
              <Input
                type="number"
                {...form.register("year", { valueAsNumber: true })}
                placeholder="e.g. 2020"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Paper</Label>
              <Input
                type="number"
                min={1}
                max={2}
                {...form.register("wassecPaper", { valueAsNumber: true })}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Image URL</Label>
            <Input
              type="url"
              {...form.register("imageUrl")}
              placeholder="https://…"
            />
          </div>

          <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-3">
            <Label>Shared stimulus</Label>
            <p className="text-xs text-slate-500">
              Past-paper questions like &ldquo;Use the table to answer Questions
              15 and 16&rdquo; share a stimulus. Mobile groups these into one
              screen with the stimulus pinned at the top.
            </p>
            <StimulusPicker
              value={form.watch("stimulusId") ?? null}
              onChange={(id) =>
                form.setValue("stimulusId", id, { shouldDirty: true })
              }
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              <Save className="h-4 w-4" />
              {mode === "edit" ? "Save changes" : "Create question"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
