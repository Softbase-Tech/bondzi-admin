"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, unwrap } from "@/lib/api";
import type { Difficulty, PmTestQuestion } from "@/types/api";

interface Props {
  question: PmTestQuestion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReviewEditSheet({ question, open, onOpenChange }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl w-full overflow-y-auto">
        {question ? (
          <EditForm
            key={question.id}
            question={question}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function EditForm({
  question,
  onDone,
}: {
  question: PmTestQuestion;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [body, setBody] = useState(question.body);
  const [explanation, setExplanation] = useState(question.explanation ?? "");
  const [difficulty, setDifficulty] = useState<Difficulty>(question.difficulty);
  const [options, setOptions] = useState(
    question.options.map((o) => ({
      id: o.id,
      label: o.label,
      body: o.body,
      isCorrect: Boolean(o.isCorrect),
    })),
  );

  const saveMut = useMutation({
    mutationFn: (payload: unknown) =>
      unwrap(api.patch(`/admin/pm-test/review/${question.id}`, payload)),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["pm-test"] });
      onDone();
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Save failed"),
  });

  const updateOption = (
    idx: number,
    patch: Partial<{ label: string; body: string; isCorrect: boolean }>,
  ) => {
    setOptions((prev) =>
      prev.map((o, i) => (i === idx ? { ...o, ...patch } : o)),
    );
  };

  const markCorrect = (idx: number) => {
    setOptions((prev) =>
      prev.map((o, i) => ({ ...o, isCorrect: i === idx })),
    );
  };

  return (
    <>
      <SheetHeader>
        <SheetTitle>Edit PM Test question</SheetTitle>
        <SheetDescription>
          Saved edits keep the question in pending_review until explicitly
          approved.
        </SheetDescription>
      </SheetHeader>

      <div className="grid gap-4 py-4 px-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Body (Markdown)</Label>
            <Textarea
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Preview</Label>
            <div className="prose prose-sm max-h-48 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-3">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {body || "_empty_"}
              </ReactMarkdown>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Options</Label>
          {options.map((o, i) => (
            <div key={i} className="flex items-start gap-2">
              <Input
                className="w-16"
                value={o.label}
                onChange={(e) => updateOption(i, { label: e.target.value })}
                maxLength={2}
              />
              <Input
                value={o.body}
                onChange={(e) => updateOption(i, { body: e.target.value })}
                placeholder="Option text"
              />
              <Button
                type="button"
                size="sm"
                variant={o.isCorrect ? "default" : "outline"}
                onClick={() => markCorrect(i)}
              >
                {o.isCorrect ? "Correct" : "Mark correct"}
              </Button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Difficulty</Label>
            <Select
              value={difficulty}
              onValueChange={(v) => setDifficulty(v as Difficulty)}
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
        </div>

        <div className="space-y-1">
          <Label>Explanation</Label>
          <Textarea
            rows={4}
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
          />
        </div>
      </div>

      <SheetFooter>
        <Button variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button
          loading={saveMut.isPending}
          onClick={() =>
            saveMut.mutate({
              body,
              explanation: explanation || null,
              difficulty,
              options,
            })
          }
        >
          Save
        </Button>
      </SheetFooter>
    </>
  );
}
