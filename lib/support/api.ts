import { api, unwrap } from "@/lib/api";
import type { Paginated } from "@/types/api";

export type SupportCategory =
  | "feedback"
  | "wrong_question"
  | "payment"
  | "general";

export type SupportStatus = "open" | "closed";

export interface SupportAttachment {
  url: string;
  mime: string;
  sizeBytes: number;
  originalFilename?: string;
}

export interface SupportTicketRow {
  id: string;
  ticketNumber: string;
  category: SupportCategory;
  subject: string;
  status: SupportStatus;
  relatedTicketNumber: string | null;
  lastReplyAt: string;
  lastReplyBy: "user" | "admin";
  closedAt: string | null;
  createdAt: string;
  messageCount: number;
  preview: string;
  user?: {
    id: string;
    fullName: string;
    email: string | null;
    username: string | null;
  };
}

export interface SupportTicketMessage {
  id: string;
  senderRole: "user" | "admin" | "system";
  senderId: string | null;
  senderName: string | null;
  body: string;
  attachments: SupportAttachment[];
  createdAt: string;
}

export interface SupportTicketDetail extends SupportTicketRow {
  messages: SupportTicketMessage[];
  context: Record<string, unknown> | null;
}

export function listTickets(params: {
  status?: SupportStatus;
  category?: SupportCategory;
  search?: string;
  page?: number;
  limit?: number;
}) {
  return unwrap<Paginated<SupportTicketRow>>(
    api.get("/admin/support/tickets", { params }),
  );
}

export function getTicket(id: string) {
  return unwrap<SupportTicketDetail>(api.get(`/admin/support/tickets/${id}`));
}

export function replyToTicket(
  id: string,
  body: string,
): Promise<SupportTicketDetail> {
  return unwrap<SupportTicketDetail>(
    api.post(`/admin/support/tickets/${id}/messages`, { body }),
  );
}

export function closeTicket(
  id: string,
  reason?: string,
): Promise<SupportTicketDetail> {
  return unwrap<SupportTicketDetail>(
    api.patch(`/admin/support/tickets/${id}/close`, { reason }),
  );
}
