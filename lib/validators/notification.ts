import { z } from "zod";

export const notificationSchema = z.object({
  title: z.string().min(2).max(120),
  body: z.string().min(5).max(500),
  channels: z.array(z.enum(["push", "sms", "in_app"])).min(1, "Pick a channel"),
  segment: z.enum(["all", "free", "paid", "expiring_soon", "custom"]),
  region: z.string().optional(),
  schoolId: z.string().uuid().optional().or(z.literal("")),
  scheduleAt: z.string().optional(),
});

export type NotificationFormData = z.infer<typeof notificationSchema>;
