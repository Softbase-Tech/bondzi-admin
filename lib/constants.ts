import type {
  AiJobStatus,
  BillingInterval,
  Difficulty,
  ExamStatus,
  ExamType,
  FinancialEventSource,
  FinancialEventType,
  FlagReason,
  QuestionStatus,
  SubscriptionStatus,
  UserRole,
} from "@/types/api";

/** Lookups used by Badge components. */

export const ROLE_LABEL: Record<UserRole, string> = {
  student: "Student",
  teacher: "Teacher",
  admin: "Admin",
  superadmin: "Superadmin",
};

export const EXAM_TYPE_LABEL: Record<ExamType, string> = {
  bece: "BECE",
  wassce: "WASSCE",
  novdec: "NOVDEC",
};

export const EXAM_TYPE_TONE: Record<ExamType, string> = {
  bece: "bg-blue-50 text-blue-700 border-blue-200",
  wassce: "bg-indigo-50 text-indigo-700 border-indigo-200",
  novdec: "bg-orange-50 text-orange-700 border-orange-200",
};

/**
 * Billing cadence label/tone maps. Subscriptions driven by XP credits carry
 * `billingInterval=null` — render via `billingIntervalLabel(sub.billingInterval)`
 * which falls back to "XP credit" when null.
 */
export const BILLING_INTERVAL_LABEL: Record<BillingInterval, string> = {
  monthly: "Monthly",
  six_month: "6-month",
  annual: "Annual",
};

export const BILLING_INTERVAL_TONE: Record<BillingInterval, string> = {
  monthly: "bg-indigo-50 text-indigo-700 border-indigo-200",
  six_month: "bg-sky-50 text-sky-700 border-sky-200",
  annual: "bg-violet-50 text-violet-700 border-violet-200",
};

export function billingIntervalLabel(
  interval: BillingInterval | null | undefined,
): string {
  return interval ? BILLING_INTERVAL_LABEL[interval] : "XP credit";
}

export function billingIntervalTone(
  interval: BillingInterval | null | undefined,
): string {
  return interval
    ? BILLING_INTERVAL_TONE[interval]
    : "bg-emerald-50 text-emerald-700 border-emerald-200";
}

/** Stable colours for payment providers. Unknown providers get the default. */
export const PROVIDER_TONE: Record<string, string> = {
  paystack: "bg-sky-50 text-sky-700 border-sky-200",
  stripe: "bg-violet-50 text-violet-700 border-violet-200",
  flutterwave: "bg-amber-50 text-amber-800 border-amber-200",
};

export const DEFAULT_PROVIDER_TONE =
  "bg-slate-100 text-slate-700 border-slate-200";

export const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  active: "Active",
  expired: "Expired",
  cancelled: "Cancelled",
  trial: "Trial",
  past_due: "Past due",
  xp_credited: "XP credited",
  refunded: "Refunded",
};

export const STATUS_TONE: Record<SubscriptionStatus, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  expired: "bg-slate-100 text-slate-700 border-slate-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
  trial: "bg-amber-50 text-amber-800 border-amber-200",
  past_due: "bg-rose-50 text-rose-700 border-rose-200",
  xp_credited: "bg-emerald-50 text-emerald-700 border-emerald-200",
  refunded: "bg-violet-50 text-violet-700 border-violet-200",
};

export const QUESTION_STATUS_LABEL: Record<QuestionStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  pending_review: "Pending review",
  archived: "Archived",
};

export const QUESTION_STATUS_TONE: Record<QuestionStatus, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactive: "bg-slate-100 text-slate-700 border-slate-200",
  pending_review: "bg-amber-50 text-amber-800 border-amber-200",
  archived: "bg-slate-100 text-slate-500 border-slate-200",
};

export const AI_JOB_STATUS_LABEL: Record<AiJobStatus, string> = {
  pending_approval: "Awaiting approval",
  pending: "Pending",
  running: "Running",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

export const AI_JOB_STATUS_TONE: Record<AiJobStatus, string> = {
  // Amber to signal "needs human action" — sits between the neutral
  // "pending" (queued, will run) and the active "running" (in flight).
  pending_approval: "bg-amber-50 text-amber-800 border-amber-200",
  pending: "bg-slate-100 text-slate-700 border-slate-200",
  running: "bg-indigo-50 text-indigo-700 border-indigo-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-rose-50 text-rose-700 border-rose-200",
  cancelled: "bg-slate-100 text-slate-500 border-slate-200",
};

export const DIFFICULTY_TONE: Record<Difficulty, string> = {
  easy: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-800 border-amber-200",
  hard: "bg-rose-50 text-rose-700 border-rose-200",
};

export const FLAG_REASON_LABEL: Record<FlagReason, string> = {
  wrong_answer: "Wrong answer",
  typo: "Typo",
  bad_image: "Bad image",
  outdated: "Outdated",
  duplicate: "Duplicate",
  other: "Other",
};

export const EXAM_STATUS_LABEL: Record<ExamStatus, string> = {
  in_progress: "In progress",
  completed: "Completed",
  abandoned: "Abandoned",
  paused: "Paused",
};

export const WEBHOOK_EVENT_TONE: Record<string, string> = {
  "charge.success": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "subscription.create": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "subscription.disable": "bg-amber-50 text-amber-800 border-amber-200",
  "subscription.not_renew": "bg-amber-50 text-amber-800 border-amber-200",
  "invoice.payment_failed": "bg-rose-50 text-rose-700 border-rose-200",
  "invoice.update": "bg-slate-100 text-slate-700 border-slate-200",
  "refund.processed": "bg-violet-50 text-violet-700 border-violet-200",
};

export const DEFAULT_WEBHOOK_TONE = "bg-slate-100 text-slate-700 border-slate-200";

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export const FINANCIAL_EVENT_LABEL: Record<FinancialEventType, string> = {
  activation: "Activation",
  renewal: "Renewal",
  cancellation: "Cancellation",
  expiration: "Expiration",
  refund: "Refund",
  xp_redemption: "XP redemption",
  xp_credit: "XP credit",
  plan_change: "Plan change",
  status_correction: "Status correction",
};

export const FINANCIAL_EVENT_TONE: Record<FinancialEventType, string> = {
  activation: "bg-emerald-50 text-emerald-700 border-emerald-200",
  renewal: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancellation: "bg-rose-50 text-rose-700 border-rose-200",
  expiration: "bg-slate-100 text-slate-700 border-slate-200",
  refund: "bg-violet-50 text-violet-700 border-violet-200",
  xp_redemption: "bg-indigo-50 text-indigo-700 border-indigo-200",
  xp_credit: "bg-emerald-50 text-emerald-700 border-emerald-200",
  plan_change: "bg-sky-50 text-sky-700 border-sky-200",
  status_correction: "bg-amber-50 text-amber-800 border-amber-200",
};

export const FINANCIAL_SOURCE_LABEL: Record<FinancialEventSource, string> = {
  webhook: "Webhook",
  admin: "Admin",
  system: "System",
  user: "User",
  job: "Job",
};
