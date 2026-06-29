/**
 * Central TanStack Query key registry.
 * Every hook imports its key from here — never build keys inline.
 */
export const QK = {
  // Users
  USERS_LIST: (filters: Record<string, unknown>) =>
    ["users", "list", filters] as const,
  USER_DETAIL: (id: string) => ["users", id] as const,
  USER_EXAMS: (id: string, filters: Record<string, unknown> = {}) =>
    ["users", id, "exams", filters] as const,
  USER_EXAM_DETAIL: (id: string, examId: string) =>
    ["users", id, "exams", examId] as const,
  USER_SUBS: (id: string) => ["users", id, "subscriptions"] as const,

  // Questions
  QUESTIONS_LIST: (filters: Record<string, unknown>) =>
    ["questions", "list", filters] as const,
  QUESTION_DETAIL: (id: string) => ["questions", id] as const,
  QUESTION_YEARS: (subjectId: string) =>
    ["questions", "years", subjectId] as const,

  // Stimuli (shared context blocks referenced by question groups)
  STIMULI_LIST: (filters?: Record<string, unknown>) =>
    ["stimuli", "list", filters ?? {}] as const,
  STIMULUS_DETAIL: (id: string) => ["stimuli", id] as const,

  // Subjects / topics
  SUBJECTS_LIST: (filters?: Record<string, unknown>) =>
    ["subjects", filters ?? {}] as const,
  SUBJECT_TOPICS: (subjectId: string) =>
    ["subjects", subjectId, "topics"] as const,
  SYLLABUS_TOPICS: (filters: Record<string, unknown>) =>
    ["syllabus-topics", filters] as const,

  // AI
  AI_USAGE: (period: string) => ["ai", "usage", period] as const,
  AI_EXPLANATIONS_PENDING: () => ["ai", "explanations", "pending"] as const,
  EXPLANATION_DETAIL: (questionId: string) =>
    ["explanations", questionId] as const,
  AI_GENERATION_JOBS: (filters?: Record<string, unknown>) =>
    ["ai", "generation", "jobs", filters ?? {}] as const,
  AI_JOB_PROGRESS: (jobId: string) =>
    ["ai", "generation", "progress", jobId] as const,
  AI_EXPLANATIONS_PENDING_APPROVAL: () =>
    ["ai", "explanations", "pending-approval"] as const,
  AI_EXPLANATIONS_CALIBRATION: (days: number) =>
    ["ai", "explanations", "calibration", days] as const,

  // PM Test
  PM_TEST_REVIEW_LIST: (filters: Record<string, unknown>) =>
    ["pm-test", "review", filters] as const,
  PM_TEST_STATS: () => ["pm-test", "stats"] as const,

  // Payments
  PAYMENT_EVENTS: (filters: Record<string, unknown>) =>
    ["payments", "events", filters] as const,
  PAYMENT_ATTEMPTS: (filters: Record<string, unknown>) =>
    ["payments", "attempts", filters] as const,
  /**
   * Full notification log — every push the platform has ever sent.
   * Used by /admin/notifications. Auto-pruned to 90 days by
   * NotificationRetentionJob.
   */
  NOTIFICATIONS_LOG: (filters: Record<string, unknown>) =>
    ["notifications", "log", filters] as const,
  BILLING_LOG: (filters: Record<string, unknown>) =>
    ["billing-log", filters] as const,
  FINANCIAL_EVENTS: (filters: Record<string, unknown>) =>
    ["financial-events", filters] as const,
  SUBSCRIPTIONS_LIST: (filters: Record<string, unknown>) =>
    ["subscriptions", "list", filters] as const,
  SUBSCRIPTION_DETAIL: (id: string) => ["subscriptions", id] as const,
  PLANS_LIST: (filters?: Record<string, unknown>) =>
    ["plans", "list", filters ?? {}] as const,
  PLAN_DETAIL: (id: string) => ["plans", id] as const,
  PLANS_PUBLIC: (country?: string) =>
    ["plans", "public", country ?? "all"] as const,

  // Promo codes (admin)
  PROMO_CODES_LIST: () => ["promo-codes", "list"] as const,
  PROMO_CODE_DETAIL: (id: string) => ["promo-codes", id] as const,

  // Legal pages (admin)
  LEGAL_PAGES_LIST: () => ["legal-pages", "list"] as const,
  LEGAL_PAGE_DETAIL: (slug: string) => ["legal-pages", slug] as const,

  // Entitlements (admin)
  ENTITLEMENTS_FOR_USER: (userId: string) =>
    ["entitlements", "user", userId] as const,
  ENTITLEMENTS_AUDIT_FOR_USER: (userId: string) =>
    ["entitlements", "user", userId, "audit"] as const,

  // XP economy
  XP_RATE_CONFIG: () => ["xp-economy", "rates"] as const,
  XP_REDEMPTION_CONFIG: () => ["xp-economy", "redemption-tiers"] as const,
  XP_ECONOMY_HEALTH: () => ["xp-economy", "health"] as const,
  XP_REDEMPTION_LOG: (filters: Record<string, unknown>) =>
    ["xp-economy", "log", filters] as const,
  XP_REFERRAL_SUMMARY: () => ["xp-economy", "referral-summary"] as const,

  // Referrals
  REFERRAL_METRICS: () => ["referrals", "metrics"] as const,
  REFERRAL_TOP: (filters: Record<string, unknown>) =>
    ["referrals", "top", filters] as const,
  REFERRAL_CHAIN: (code: string) => ["referrals", "chain", code] as const,
  REFERRAL_SHARE_TEMPLATE: () => ["referrals", "share-template"] as const,

  // Winners
  WINNERS_LIST: (filters: Record<string, unknown>) =>
    ["winners", "list", filters] as const,
  WINNERS_CANDIDATES: (filters: Record<string, unknown>) =>
    ["winners", "candidates", filters] as const,
  WINNERS_HALL_OF_FAME: (filters: Record<string, unknown>) =>
    ["winners", "hall-of-fame", filters] as const,
  /**
   * Every (exam_type, period_type, period_start) tuple awaiting
   * winner selection — drives the "Pending periods" card on
   * /admin/winners so a missed week stays visible.
   */
  WINNERS_PENDING_PERIODS: () =>
    ["winners", "pending-periods"] as const,

  // Ads config
  ADS_CONFIG: () => ["ads", "config"] as const,

  // Jobs
  JOBS_STATUS: () => ["jobs", "status"] as const,

  // Dashboard
  DASHBOARD_METRICS: () => ["dashboard", "metrics"] as const,

  // Flags
  FLAGS_LIST: (filters: Record<string, unknown>) =>
    ["flags", "list", filters] as const,

  // Leaderboard
  LEADERBOARD: (filters: Record<string, unknown>) =>
    ["leaderboard", filters] as const,

  // Audit
  AUDIT_LOG: (filters: Record<string, unknown>) =>
    ["audit", "list", filters] as const,

  // Schools [P2]
  SCHOOLS_LIST: () => ["schools"] as const,
  SCHOOL_DETAIL: (id: string) => ["schools", id] as const,
  CLASS_PROGRESS: (schoolId: string) =>
    ["schools", schoolId, "progress"] as const,
} as const;
