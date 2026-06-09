/**
 * Mirror of the NestJS backend response shapes. Kept hand-written (rather than
 * generated) to keep the admin deliberately coupled to the fields it actually
 * needs. When a backend field is added and the admin cares about it, add it
 * here first, then use it.
 */

export type UserRole = "student" | "teacher" | "admin" | "superadmin";
export type AuthProvider = "email" | "google" | "phone";
export type ExamType = "bece" | "wassce" | "novdec";
export type SchoolLevel = "jhs" | "shs" | "remedial";
/**
 * Billing cadence on a subscription. A plan row bundles all three — the
 * user picks one at checkout. XP-credited subs carry null here.
 */
export type BillingInterval = "monthly" | "six_month" | "annual";
export type SubscriptionStatus =
  | "active"
  | "expired"
  | "cancelled"
  | "trial"
  | "past_due"
  | "xp_credited"
  // Terminal state after a Plus row is refunded out-of-band. The
  // entitlement is gone but the row stays for audit.
  | "refunded";
export type Difficulty = "easy" | "medium" | "hard";
export type QuestionType =
  | "mcq"
  | "true_false"
  | "fill_blank"
  | "essay"
  | "structured";
export type QuestionSource = "wassce_past" | "bece_past" | "ai_passmaster_test";
export type QuestionStatus =
  | "active"
  | "inactive"
  | "pending_review"
  | "archived";
export type QuestionPool = "past_paper" | "pm_test";
export type FlagReason =
  | "wrong_answer"
  | "typo"
  | "bad_image"
  | "outdated"
  | "duplicate"
  | "other";
export type ExamMode =
  | "past_paper"
  | "practice"
  | "topic_drill"
  | "pm_test"
  | "srs_review";
export type ExamStatus = "in_progress" | "completed" | "abandoned" | "paused";
export type NotificationChannel = "push" | "sms" | "whatsapp" | "in_app";
export type AiJobType = "explanation_bulk" | "pm_test_generation";
export type AiJobStatus =
  // Held awaiting a second admin's approval because estimated cost
  // exceeds AI_COSIGN_THRESHOLD_USD. NOT enqueued for processing.
  | "pending_approval"
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";
export type LeaderboardPeriodType = "weekly" | "monthly";

/**
 * Money-touching events surfaced on the admin "Billing log" page.
 * Source of truth is the backend's `financial_events` table.
 */
export type FinancialEventType =
  | "activation"
  | "renewal"
  | "cancellation"
  | "expiration"
  | "refund"
  | "xp_redemption"
  | "xp_credit"
  | "plan_change"
  | "status_correction";

export type FinancialEventSource =
  | "webhook"
  | "admin"
  | "system"
  | "user"
  | "job";

export interface FinancialEvent {
  id: string;
  eventType: FinancialEventType;
  userId: string | null;
  subscriptionId: string | null;
  amountMinor: number | null;
  currency: string | null;
  source: FinancialEventSource;
  actorId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface User {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  examType: ExamType;
  schoolLevel: SchoolLevel;
  formLevel: number;
  schoolName: string | null;
  region: string | null;
  avatarUrl: string | null;
  countryCode: string;
  isActive: boolean;
  referralCode: string;
  referredBy: string | null;
  referralQualified: boolean;
  levelXp: number;
  spendableXp: number;
  currentLevel: number;
  streakDays: number;
  longestStreak: number;
  referralCount?: number;
  lastActiveAt: string | null;
  createdAt: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  examType: ExamType;
  category: "core" | "elective" | "vocational";
  isCore: boolean;
  isActive: boolean;
  sortOrder: number;
  topicCount?: number;
  questionCount?: number;
}

export interface Topic {
  id: string;
  subjectId: string;
  title: string;
  description: string | null;
  sortOrder: number;
  questionCount?: number;
}

export interface SyllabusTopic {
  id: string;
  subjectId: string;
  examType: ExamType;
  formLevel: number;
  title: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface Option {
  id: string;
  label: string;
  body: string;
  bodyHtml: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isCorrect?: boolean;
}

/**
 * Shared context block referenced by 2+ questions in past-paper grouped
 * items ("Use the table to answer Q15 and Q16"). Past-paper authoring picks
 * an existing stimulus or creates a new one inline.
 */
export interface QuestionStimulus {
  id: string;
  title: string | null;
  body: string;
  bodyHtml: string | null;
  imageUrl: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  /** Number of questions referencing this stimulus — populated by the list endpoint. */
  questionCount?: number;
}

export interface Question {
  id: string;
  subjectId: string;
  topicId: string | null;
  stimulusId: string | null;
  stimulus: QuestionStimulus | null;
  subject?: Subject;
  topic?: Topic | null;
  examType: ExamType;
  questionType: QuestionType;
  source: QuestionSource;
  body: string;
  bodyHtml: string | null;
  imageUrl: string | null;
  year: number | null;
  wassecPaper: number | null;
  section: string | null;
  difficulty: Difficulty;
  tags: string[];
  status: QuestionStatus;
  isVerified: boolean;
  flagCount: number;
  timesAnswered: number;
  timesCorrect: number;
  explanation: string | null;
  explanationHtml: string | null;
  explanationModel: string | null;
  explanationGeneratedAt: string | null;
  createdAt: string;
  updatedAt: string;
  options: Option[];
}

export interface PmTestQuestion {
  id: string;
  subjectId: string;
  subject?: Subject;
  syllabusTopicId: string | null;
  examType: ExamType;
  formLevel: number;
  questionType: QuestionType;
  body: string;
  explanation: string | null;
  difficulty: Difficulty;
  status: QuestionStatus;
  generationBatchId: string | null;
  timesAnswered: number;
  timesCorrect: number;
  createdAt: string;
  options: Option[];
}

export interface Subscription {
  id: string;
  userId: string;
  user?: User;
  /** FK to subscription_plan. NULL for XP-credited subs. */
  planId: string | null;
  plan?: SubscriptionPlan | null;
  /** Which cadence within the plan was purchased. NULL for XP credits. */
  billingInterval: BillingInterval | null;
  /** Payment provider that sold this subscription ('paystack' | ...). */
  provider: string | null;
  status: SubscriptionStatus;
  providerReference: string | null;
  providerSubscriptionId: string | null;
  providerCustomerId: string | null;
  amountGhs: string | null;
  xpRedemptionId: string | null;
  countryCode: string;
  startsAt: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentEvent {
  id: string;
  userId: string | null;
  provider: string;
  providerEventId: string;
  eventType: string;
  rawPayload: Record<string, unknown>;
  processed: boolean;
  processedAt: string | null;
  error: string | null;
  createdAt: string;
}

/**
 * A single checkout attempt — written by SubscriptionsService.initiate
 * BEFORE Paystack is called. Replaces the old "subscriptions with status
 * = PAST_DUE" shape that conflated checkout attempts with real
 * entitlements.
 */
export type PaymentAttemptStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "abandoned";

export interface PaymentAttempt {
  id: string;
  userId: string;
  subscriptionId: string | null;
  planId: string | null;
  billingInterval: BillingInterval | null;
  amountMinor: number;
  amountGhs: number;
  currency: string;
  provider: string;
  providerReference: string;
  providerEventId: string | null;
  providerCustomerId: string | null;
  promoCodeId: string | null;
  discountAmount: number | null;
  status: PaymentAttemptStatus;
  initiatedAt: string;
  paidAt: string | null;
  failedAt: string | null;
  refundedAt: string | null;
  abandonedAt: string | null;
  failureReason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  plan?: {
    id: string;
    name: string;
    account: AccountType;
    level: ExamType;
    paymentKind: "one_time" | "recurring";
  } | null;
  user?: { id: string; email: string | null; fullName: string | null } | null;
}

export type BillingLogProcessStatus =
  | "received"
  | "success"
  | "no_matching_payment"
  | "duplicate"
  | "error";

export interface BillingLog {
  id: string;
  provider: string;
  eventType: string;
  providerEventId: string;
  reference: string | null;
  userId: string | null;
  paymentAttemptId: string | null;
  subscriptionId: string | null;
  rawPayload: Record<string, unknown>;
  signature: string | null;
  normalized: Record<string, unknown> | null;
  occurredAt: string | null;
  receivedAt: string;
  processedAt: string | null;
  processStatus: BillingLogProcessStatus;
  processError: string | null;
  createdAt: string;
}

export interface QuestionFlag {
  id: string;
  questionId: string;
  questionPool: QuestionPool;
  userId: string;
  reason: FlagReason;
  note: string | null;
  isResolved: boolean;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  question?: Pick<Question, "id" | "body" | "subjectId">;
}

export interface AiUsageRow {
  day: string;
  model: string;
  calls: string;
  costUsd: string;
}

export interface AiUsageBreakdown {
  byDay: AiUsageRow[];
  byAction: Array<{ action: string; calls: string; costUsd: string }>;
  topUsers: Array<{ userId: string; calls: string; costUsd: string }>;
}

export interface DashboardMetrics {
  totalUsers: number;
  activeSubscriptions: number;
  mrrGhs: number;
  questionsAnsweredToday: number;
  aiCostUsdToday: number;
  pendingFlags: number;

  spendableXpOutstanding: number;
  xpIssuedThisWeek: number;
  xpRedeemedThisWeek: number;

  referralSignupsThisWeek: number;
  referralQualificationRate: number;
  referralXpIssuedToday: number;
  referralDaily14d: Array<{ day: string; signups: number }>;

  activeUsersBece: number;
  activeUsersWassce: number;
  /**
   * NOVDEC is a distinct level for billing / leaderboards / entitlements
   * even though students share the WASSCE question pool. Surfaced as a
   * separate user count so admins can track Remedial adoption — no
   * `questionsNovdec` tile because the catalogue number would duplicate
   * `questionsWassce`.
   */
  activeUsersNovdec: number;
  questionsBece: number;
  questionsWassce: number;
  questionsBeceExplained: number;
  questionsWassceExplained: number;

  pmTestActiveBece: number;
  pmTestActiveWassce: number;
  pmTestPendingReview: number;
  pmTestLastGenerationAt: string | null;

  winnersPendingWeeklyBece: boolean;
  winnersPendingWeeklyWassce: boolean;
  winnersPendingWeeklyNovdec: boolean;
  winnersPeriodEndedAt: string | null;
}

export interface AuditLogRow {
  id: string;
  adminId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  nextCursor: string | null;
}

export interface ApiEnvelope<T> {
  data: T;
}

export interface LeaderboardRow {
  userId: string;
  fullName: string;
  /**
   * Period XP — sum of XP earned within the active period
   * (weekly or monthly) for this exam_type. The backend reads it
   * from `leaderboard_entries.weekly_xp` and aliases it `score` on
   * the wire regardless of period; the column name is a historical
   * artefact from when only weekly boards existed.
   */
  score: number;
  rank: number;
  // Carried through for legacy callers that paginated by exam_type.
  // Optional because the admin / mobile leaderboard endpoints don't
  // include it; the filter is on the URL instead.
  examType?: ExamType;
  avatarUrl?: string | null;
}

/**
 * Admin view of a subscription plan row. Each row bundles all three
 * cadences (monthly / six-month / annual) with their prices, durations,
 * and provider-side plan codes.
 *
 * Price/duration changes insert a NEW row (version N+1) and flip the
 * previous row `isActive=false`. `parentPlanId` points at the immediate
 * predecessor, giving the UI a version chain to render ("Archived v1").
 */
/**
 * Plan grade. Drives the entitlement gates in the API + mobile.
 *  - 'plus' = one-time lifetime per-level access (past papers + AI explanations).
 *  - 'pro'  = recurring per-level subscription (everything in Plus + AI tests).
 *  - 'free' is implicit — never a plan row.
 */
export type AccountType = 'free' | 'plus' | 'pro';

/** What level the plan unlocks. NOVDEC reuses the WASSCE question pool. */
export type PlanLevel = 'bece' | 'wassce' | 'novdec';

/** Payment kind. One-time = Plus (lifetime); recurring = Pro (Paystack subscription). */
export type PaymentKind = 'one_time' | 'recurring';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  countryCode: string;
  currency: string;
  provider: string;

  /** Plan grade. `plus` is one-time/lifetime; `pro` is recurring. */
  account: AccountType;

  /** Exam-platform the plan unlocks. */
  level: PlanLevel;

  /**
   * `one_time` (Plus): single charge, lifetime grant, `expires_at = NULL`
   * on the resulting subscription row. Cadence prices (six-month, annual)
   * are stored as 0 and never used.
   *
   * `recurring` (Pro): Paystack subscription with three cadences (monthly,
   * six-month, annual). All three prices must be > 0.
   */
  paymentKind: PaymentKind;

  /**
   * VAT (or VAT-equivalent levy stack) baked into the displayed price.
   * Stored INCLUSIVELY — a `vatRatePct` of 15 on a 200 GHS plan means
   * the user pays 200 at checkout; the receipt PDF breaks it down into
   * ~173.91 net + ~26.09 VAT.
   */
  vatRatePct: number;

  // Numeric on the wire now — backend uses a NumericColumnTransformer
  // on the entity so the JSON serialisation emits real numbers, not
  // strings. Defensive Number() wrappers in this codebase are no
  // longer necessary.
  monthlyPrice: number;
  sixMonthPrice: number;
  annualPrice: number;

  monthlyDurationDays: number;
  sixMonthDurationDays: number;
  annualDurationDays: number;

  providerPlanMonthly: string | null;
  providerPlanSixMonth: string | null;
  providerPlanAnnual: string | null;

  isActive: boolean;
  isDefault: boolean;
  version: number;
  parentPlanId: string | null;

  /**
   * Set when a price change triggered a version bump. The OLD version's
   * row stays isActive=true for CHECKOUT_GRACE_HOURS (backend default
   * 48h) so any open Paystack checkoutUrls referring to it still
   * resolve. Render an "Archives in Xh" badge while archiveAt is in
   * the future.
   */
  archiveAt: string | null;
  /** Tombstone — set by a scheduled cleanup after archiveAt passes. */
  deletedAt: string | null;

  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Promo codes
// ============================================================================

export type PromoDiscountType = "percent" | "fixed";

export interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  discountType: PromoDiscountType;
  /** String on the wire (TypeORM numeric column). Cast to Number for math. */
  discountValue: string;
  applicableAccount: AccountType | null;
  applicableLevel: PlanLevel | null;
  maxRedemptions: number | null;
  redeemedCount: number;
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Legal pages
// ============================================================================

export interface LegalPage {
  id: string;
  slug: string;
  title: string;
  body: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Entitlements
// ============================================================================

export interface UserEntitlement {
  level: PlanLevel;
  account: AccountType;
  expiresAt: string | null;
  subscriptionId: string | null;
}

/**
 * Re-using the generic `audit_log` row shape — entitlement-change rows
 * use action='entitlement.grant'|'entitlement.revoke'|'entitlement.refund'.
 */
export interface EntitlementAuditRow {
  id: string;
  adminId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

/** Public catalogue shape returned by GET /plans. */
export interface PublicPlanView {
  id: string;
  name: string;
  description: string | null;
  countryCode: string;
  currency: string;
  isDefault: boolean;
  pricing: {
    monthly: PublicCadenceView;
    sixMonth: PublicCadenceView;
    annual: PublicCadenceView;
  };
}

export interface PublicCadenceView {
  price: number;
  durationDays: number;
  available: boolean;
}

// ---------- AI generation ----------

export interface AiGenerationJob {
  id: string;
  jobType: AiJobType;
  status: AiJobStatus;
  triggeredBy: string;
  triggeredByName?: string;
  parameters: Record<string, unknown>;
  totalItems: number | null;
  completedItems: number;
  failedItems: number;
  estimatedCostUsd: string | null;
  actualCostUsd: string | null;
  modelUsed: string | null;
  startedAt: string | null;
  completedAt: string | null;
  errorLog: string | null;
  /**
   * Co-sign tracking. When the estimated cost exceeds the backend
   * AI_COSIGN_THRESHOLD_USD, the job is created with
   * status='pending_approval' and approvedBy / approvedAt stay null
   * until a second admin (≠ triggeredBy) calls POST .../approve.
   */
  approvedBy: string | null;
  approvedByName?: string;
  approvedAt: string | null;
  createdAt: string;
}

export interface ExplanationPreviewResponse {
  token: string;
  totalQuestions: number;
  estimatedCostUsd: number;
  estimatedMinutes: number;
  model: string;
}

export interface PmTestGenerationRow {
  examType: ExamType;
  formLevel: number;
  subjectId: string;
  subjectName: string;
  questionCount: number;
  difficultyMix: { easy: number; medium: number; hard: number };
  mode: "append" | "replace";
  syllabusTopicIds?: string[];
}

export interface PmTestPreviewResponse {
  token: string;
  totalQuestions: number;
  estimatedCostUsd: number;
  estimatedMinutes: number;
  model: string;
  includeExplanations: boolean;
  breakdown: Array<{
    examType: ExamType;
    formLevel: number;
    subjectId: string;
    subjectName: string;
    questionCount: number;
    estimatedCostUsd: number;
  }>;
}

export interface JobProgressEvent {
  jobId: string;
  processed: number;
  total: number;
  failed: number;
  costUsdSoFar: number;
  rate: number;
  etaSeconds: number | null;
  status: AiJobStatus;
}

// ---------- XP economy ----------

export interface XpRateConfig {
  id: string;
  eventKey: string;
  label: string;
  xpAmount: number;
  isActive: boolean;
  updatedAt: string;
}

export interface XpRedemptionConfig {
  id: string;
  tierKey: string;
  label: string;
  xpCost: number;
  creditDays: number;
  isActive: boolean;
  updatedAt: string;
}

export interface XpEconomyHealth {
  spendableXpOutstanding: number;
  xpIssuedThisWeek: number;
  xpRedeemedThisWeek: number;
  redemptionRate: number;
  daily30d: Array<{ day: string; issued: number; redeemed: number }>;
}

export interface XpRedemptionLogRow {
  id: string;
  userId: string;
  userName: string;
  tierKey: string;
  tierLabel: string;
  xpSpent: number;
  creditDays: number;
  appliedAt: string;
}

export interface ReferralXpSummary {
  totalReferralXp: number;
  activeChains: number;
  topReferrers: Array<{
    userId: string;
    fullName: string;
    totalXp: number;
    referralCount: number;
  }>;
}

// ---------- Referrals ----------

export interface ReferralMetrics {
  totalSignups: number;
  qualificationRate: number;
  totalXpIssued: number;
  signupsThisWeek: number;
  daily30d: Array<{ day: string; signups: number; qualified: number }>;
}

export interface TopReferrerRow {
  userId: string;
  fullName: string;
  examType: ExamType;
  totalReferrals: number;
  qualifiedReferrals: number;
  totalXpEarned: number;
  lastReferralAt: string | null;
}

export interface ReferralChainRow {
  referredId: string;
  referredName: string;
  qualified: boolean;
  qualifiedAt: string | null;
  signupXpIssued: boolean;
  qualifyXpIssued: boolean;
  createdAt: string;
}

// ---------- Winners ----------

export interface WinnerCandidate {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  rank: number;
  weeklyXp: number;
  accountAgeDays: number;
  questionsAnswered: number;
  verified: boolean;
  antiCheatPass: boolean;
  antiCheatReason: string | null;
}

export interface Winner {
  id: string;
  userId: string;
  userName: string;
  examType: ExamType;
  periodType: LeaderboardPeriodType;
  periodStart: string;
  rank: number;
  xpEarned: number;
  xpIssued: boolean;
  xpIssuedAt: string | null;
  selectedBy: string | null;
  selectedAt: string | null;
  createdAt: string;
}

export interface HallOfFameRow {
  userId: string;
  fullName: string;
  examType: ExamType;
  totalWins: number;
  totalXpFromPrizes: number;
}

// ---------- Ads ----------

export interface AdConfig {
  id: string;
  adsEnabled: boolean;
  adNetwork: string;
  admobAppId: string | null;
  admobInterstitialId: string | null;
  admobRewardedId: string | null;
  rewardedXpAmount: number;
  frequencyCap: number;
  triggerEvent: string;
  updatedAt: string;
}
