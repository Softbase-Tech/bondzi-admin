"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { QK } from "@/lib/query-keys";
import { listPartners } from "@/lib/partners/api";
import type { PartnerStatus } from "@/types/api";
import { PageHeader } from "@/components/admin/layout/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";
import { STATUS_TONE, statusLabel } from "@/components/admin/partners/status-badge";

const PAGE_SIZE = 20;

export default function PartnersListPage() {
  const [status, setStatus] = useState<PartnerStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filters = useMemo(
    () => ({
      status: status === "all" ? undefined : status,
      search: search.trim() || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [status, search, page],
  );

  const { data, isLoading } = useQuery({
    queryKey: QK.PARTNERS_LIST(filters),
    queryFn: () => listPartners(filters),
  });

  const totalPages = Math.max(
    1,
    Math.ceil((data?.total ?? 0) / PAGE_SIZE),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Partners"
        description="Marketers earning commission on Bondzi conversions."
      />

      <Card className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:w-80">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <Input
            placeholder="Search by name, email, phone…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-8"
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as PartnerStatus | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="banned">Banned</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (data?.items.length ?? 0) === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No partners match this filter.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Fraud flags</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data!.items.map((p) => (
                <TableRow
                  key={p.id}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <TableCell>
                    <Link
                      href={`/admin/partners/${p.id}`}
                      className="font-medium text-slate-900 hover:text-orange-600"
                    >
                      {p.fullName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-slate-600">{p.email}</TableCell>
                  <TableCell className="text-slate-600">{p.phone}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${
                        STATUS_TONE[p.status]
                      }`}
                    >
                      {statusLabel(p.status)}
                    </span>
                  </TableCell>
                  <TableCell
                    className={
                      p.fraudFlagCount > 0
                        ? "font-medium text-rose-700"
                        : "text-slate-500"
                    }
                  >
                    {p.fraudFlagCount}
                  </TableCell>
                  <TableCell className="text-slate-500">
                    {formatDateTime(p.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            Page {page} of {totalPages} · {data?.total ?? 0} partners
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium disabled:opacity-40 hover:bg-slate-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() =>
                setPage((p) => (p < totalPages ? p + 1 : p))
              }
              disabled={page >= totalPages}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium disabled:opacity-40 hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
