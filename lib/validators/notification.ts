import { z } from "zod";

export const notificationSchema = z.object({
  title: z.string().min(2).max(120),
  body: z.string().min(5).max(500),
  channels: z
    .array(z.enum(["push", "sms", "in_app", "email"]))
    .min(1, "Pick a channel"),
  segment: z.enum(["all", "free", "paid", "expiring_soon", "custom"]),
  /**
   * Only meaningful when EMAIL is selected alongside PUSH. true (the
   * backend default) = email goes only to users with no push-capable
   * device — the cost-guarded fallback pattern. false = email the whole
   * segment regardless of push reachability (a deliberate full blast).
   */
  emailFallbackOnly: z.boolean().optional(),
  region: z.string().optional(),
  schoolId: z.string().uuid().optional().or(z.literal("")),
  scheduleAt: z.string().optional(),
});

export type NotificationFormData = z.infer<typeof notificationSchema>;
