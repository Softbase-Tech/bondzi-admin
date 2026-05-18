import { z } from "zod";

export const optionSchema = z.object({
  label: z.string().min(1).max(2),
  body: z.string().min(1, "Option body is required"),
  imageUrl: z.string().url().optional().or(z.literal("")),
  isCorrect: z.boolean(),
  sortOrder: z.number().int().optional(),
});

export const createQuestionSchema = z
  .object({
    subjectId: z.string().uuid(),
    topicId: z.string().uuid().optional().or(z.literal("")),
    /**
     * Optional shared-stimulus FK. `null` means standalone; UUID means the
     * question is bound to a stimulus group (rendered with the stimulus
     * pinned at the top of the exam screen on mobile).
     */
    stimulusId: z.string().uuid().nullable().optional(),
    examType: z.enum(["bece", "wassce"]),
    questionType: z.enum([
      "mcq",
      "true_false",
      "fill_blank",
      "essay",
      "structured",
    ]),
    source: z.enum(["wassce_past", "bece_past", "ai_passmaster_test"]),
    body: z.string().min(10, "Question must be at least 10 characters"),
    imageUrl: z.string().url().optional().or(z.literal("")),
    year: z.number().int().min(1990).max(2100).optional(),
    wassecPaper: z.number().int().min(1).max(2).optional(),
    section: z.string().max(4).optional(),
    difficulty: z.enum(["easy", "medium", "hard"]),
    tags: z.array(z.string()).optional(),
    options: z.array(optionSchema).min(2, "At least 2 options required"),
  })
  .refine((q) => q.options.filter((o) => o.isCorrect).length === 1, {
    message: "Exactly one option must be marked correct",
    path: ["options"],
  });

export type QuestionFormData = z.infer<typeof createQuestionSchema>;
