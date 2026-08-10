import { api, unwrap } from "@/lib/api";
import type {
  Paginated,
  Partner,
  PartnerAppeal,
  PartnerAppealStatus,
  PartnerBanner,
  PartnerBannerAspect,
  PartnerCommission,
  PartnerCommissionStatus,
  PartnerCommissionType,
  PartnerDetail,
  PartnerFraudEvent,
  PartnerFraudSeverity,
  PartnerPayout,
  PartnerPayoutPreview,
  PartnerPayoutStatus,
  PartnerStatus,
  PartnerTermsVersion,
} from "@/types/api";

/**
 * Thin wrappers around every admin partner endpoint. Every function
 * returns the unwrapped `data` payload (the envelope layer is
 * absorbed by `unwrap`). Kept as plain functions rather than a class
 * so React Query hooks can pass them straight into `queryFn`.
 */

// -------------------------- Partners -----------------------------

export function listPartners(params: {
  status?: PartnerStatus;
  search?: string;
  page?: number;
  limit?: number;
}) {
  return unwrap<Paginated<Partner>>(
    api.get("/admin/partners", { params }),
  );
}

export function getPartnerDetail(id: string) {
  return unwrap<PartnerDetail>(api.get(`/admin/partners/${id}`));
}

export function approvePartner(id: string) {
  return unwrap<Partner>(api.post(`/admin/partners/${id}/approve`));
}

export function suspendPartner(id: string, reason: string) {
  return unwrap<Partner>(
    api.post(`/admin/partners/${id}/suspend`, { reason }),
  );
}

export function banPartner(id: string, reason: string) {
  return unwrap<Partner>(api.post(`/admin/partners/${id}/ban`, { reason }));
}

// -------------------------- Commissions --------------------------

export function listCommissions(params: {
  partnerId?: string;
  status?: PartnerCommissionStatus;
  type?: PartnerCommissionType;
  page?: number;
  limit?: number;
}) {
  return unwrap<Paginated<PartnerCommission>>(
    api.get("/admin/partners/commissions/list", { params }),
  );
}

export function resolveFlaggedCommission(
  id: string,
  decision: "approve" | "clawback",
  note?: string,
) {
  const url =
    decision === "approve"
      ? `/admin/partners/commissions/${id}/approve`
      : `/admin/partners/commissions/${id}/clawback`;
  return unwrap<PartnerCommission>(api.post(url, note ? { note } : {}));
}

// -------------------------- Payouts ------------------------------

export function listPayouts(params: {
  partnerId?: string;
  status?: PartnerPayoutStatus;
  page?: number;
  limit?: number;
}) {
  return unwrap<Paginated<PartnerPayout>>(
    api.get("/admin/partners/payouts/list", { params }),
  );
}

export function getPayoutDetail(id: string) {
  return unwrap<{
    payout: PartnerPayout;
    partner: Partner;
    commissions: PartnerCommission[];
  }>(api.get(`/admin/partners/payouts/${id}`));
}

export function previewPayoutForPartner(partnerId: string) {
  return unwrap<PartnerPayoutPreview>(
    api.get(`/admin/partners/${partnerId}/payouts/preview`),
  );
}

export function createPayoutForPartner(
  partnerId: string,
  body: { weekOf?: string; notes?: string } = {},
) {
  return unwrap<PartnerPayout>(
    api.post(`/admin/partners/${partnerId}/payouts`, body),
  );
}

export function markPayoutPaid(id: string, momoReference: string) {
  return unwrap<PartnerPayout>(
    api.post(`/admin/partners/payouts/${id}/mark-paid`, { momoReference }),
  );
}

export function markPayoutFailed(id: string, reason: string) {
  return unwrap<PartnerPayout>(
    api.post(`/admin/partners/payouts/${id}/mark-failed`, { reason }),
  );
}

/**
 * The invoice PDF endpoint streams application/pdf directly (no
 * envelope). We hit it with `responseType: 'blob'` so axios doesn't
 * try to JSON-parse the bytes, then trigger a download.
 */
export async function downloadPayoutInvoice(payoutId: string): Promise<void> {
  const res = await api.get(
    `/admin/partners/payouts/${payoutId}/invoice.pdf`,
    { responseType: "blob" },
  );
  const blob = res.data as Blob;
  const disposition =
    (res.headers?.["content-disposition"] as string | undefined) ?? "";
  const nameMatch = /filename="?([^"]+)"?/i.exec(disposition);
  const filename = nameMatch?.[1] ?? `bondzi-invoice-${payoutId}.pdf`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// -------------------------- Appeals ------------------------------

export function listAppeals(params: {
  partnerId?: string;
  status?: PartnerAppealStatus;
  page?: number;
  limit?: number;
}) {
  return unwrap<Paginated<PartnerAppeal>>(
    api.get("/admin/partners/appeals/list", { params }),
  );
}

export function resolveAppeal(
  id: string,
  decision: "upheld" | "denied",
  resolutionNote?: string,
) {
  return unwrap<PartnerAppeal>(
    api.post(`/admin/partners/appeals/${id}/resolve`, {
      decision,
      resolutionNote,
    }),
  );
}

// -------------------------- Fraud events -------------------------

export function listFraudEvents(params: {
  partnerId?: string;
  severity?: PartnerFraudSeverity;
  resolved?: boolean;
  page?: number;
  limit?: number;
}) {
  return unwrap<Paginated<PartnerFraudEvent>>(
    api.get("/admin/partners/fraud-events/list", {
      params: {
        ...params,
        resolved:
          params.resolved === undefined ? undefined : String(params.resolved),
      },
    }),
  );
}

export function resolveFraudEvent(id: string, resolutionNote?: string) {
  return unwrap<PartnerFraudEvent>(
    api.post(`/admin/partners/fraud-events/${id}/resolve`, {
      resolutionNote,
    }),
  );
}

// -------------------------- Terms --------------------------------

export function listTerms() {
  return unwrap<PartnerTermsVersion[]>(
    api.get("/admin/partners/terms/list"),
  );
}

export function createTermsVersion(body: {
  title: string;
  bodyMd: string;
  changeSummary: string;
  plusWassce: string;
  plusNovdec: string;
  plusBece: string;
  signupBatchSize?: number;
  signupBatchAmountGhs?: string;
  signupMinCompletedAnswers?: number;
  answersBonusThreshold?: number;
  answersBonusAmountGhs?: string;
  attributionWindowDays?: number;
  maxFraudFlagsBeforeBlock?: number;
  maxAppeals?: number;
  effectiveFrom?: string;
}) {
  return unwrap<PartnerTermsVersion>(
    api.post("/admin/partners/terms", body),
  );
}

// -------------------------- Banners ------------------------------

export function listAllBanners() {
  return unwrap<PartnerBanner[]>(api.get("/admin/partners/banners/list"));
}

export function createBanner(body: {
  label: string;
  description?: string;
  imageUrl: string;
  aspect: PartnerBannerAspect;
  widthPx?: number;
  heightPx?: number;
  sortOrder?: number;
  isActive?: boolean;
}) {
  return unwrap<PartnerBanner>(api.post("/admin/partners/banners", body));
}

export function updateBanner(
  id: string,
  body: Partial<{
    label: string;
    description: string;
    imageUrl: string;
    aspect: PartnerBannerAspect;
    widthPx: number;
    heightPx: number;
    sortOrder: number;
    isActive: boolean;
  }>,
) {
  return unwrap<PartnerBanner>(
    api.patch(`/admin/partners/banners/${id}`, body),
  );
}

export function deleteBanner(id: string): Promise<void> {
  return api.delete(`/admin/partners/banners/${id}`).then(() => undefined);
}
