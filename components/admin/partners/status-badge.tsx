import type {
  PartnerAppealStatus,
  PartnerCommissionStatus,
  PartnerFraudSeverity,
  PartnerPayoutStatus,
  PartnerStatus,
} from "@/types/api";

// -----------------------------------------------------------------
// Tone maps shared across every partner-admin table + card. Kept as
// simple lookup objects so React doesn't have to re-render a
// component tree just to compute a colour class.
// -----------------------------------------------------------------

export const STATUS_TONE: Record<PartnerStatus, string> = {
  pending: "border-amber-300 bg-amber-50 text-amber-700",
  active: "border-emerald-300 bg-emerald-50 text-emerald-700",
  suspended: "border-orange-300 bg-orange-50 text-orange-700",
  banned: "border-rose-300 bg-rose-50 text-rose-700",
};

export function statusLabel(s: PartnerStatus): string {
  switch (s) {
    case "pending":
      return "Pending review";
    case "active":
      return "Active";
    case "suspended":
      return "Suspended";
    case "banned":
      return "Banned";
  }
}

export const COMMISSION_STATUS_TONE: Record<PartnerCommissionStatus, string> = {
  pending: "border-slate-300 bg-slate-50 text-slate-700",
  approved: "border-emerald-300 bg-emerald-50 text-emerald-700",
  flagged: "border-orange-300 bg-orange-50 text-orange-700",
  clawed_back: "border-rose-300 bg-rose-50 text-rose-700",
  paid: "border-sky-300 bg-sky-50 text-sky-700",
};

export const PAYOUT_STATUS_TONE: Record<PartnerPayoutStatus, string> = {
  pending: "border-amber-300 bg-amber-50 text-amber-700",
  paid: "border-emerald-300 bg-emerald-50 text-emerald-700",
  failed: "border-rose-300 bg-rose-50 text-rose-700",
};

export const APPEAL_STATUS_TONE: Record<PartnerAppealStatus, string> = {
  open: "border-amber-300 bg-amber-50 text-amber-700",
  upheld: "border-emerald-300 bg-emerald-50 text-emerald-700",
  denied: "border-rose-300 bg-rose-50 text-rose-700",
};

export const FRAUD_SEVERITY_TONE: Record<PartnerFraudSeverity, string> = {
  low: "border-slate-300 bg-slate-50 text-slate-700",
  medium: "border-amber-300 bg-amber-50 text-amber-700",
  high: "border-rose-300 bg-rose-50 text-rose-700",
};
