"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Shield, ShieldAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { formatNumber, initials } from "@/lib/utils";
import type { ExamType, LeaderboardPeriodType, WinnerCandidate } from "@/types/api";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  examType: ExamType;
  periodType: LeaderboardPeriodType;
  periodStart: string;
}

export function WinnerSelectionModal({
  open,
  onOpenChange,
  examType,
  periodType,
  periodStart,
}: Props) {
  const qc = useQueryClient();
  const filters = { examType, periodType, periodStart };

  const { data, isLoading } = useQuery({
    queryKey: QK.WINNERS_CANDIDATES(filters),
    enabled: open,
    queryFn: () =>
      unwrap<WinnerCandidate[]>(
        api.get("/admin/winners/candidates", { params: filters }),
      ),
  });

  const [unchecked, setUnchecked] = useState<Set<string>>(new Set());

  const confirmMut = useMutation({
    mutationFn: () =>
      unwrap(
        api.post("/admin/winners/confirm", {
          ...filters,
          excludeUserIds: Array.from(unchecked),
        }),
      ),
    onSuccess: () => {
      toast.success("Winners confirmed — XP prizes issued");
      qc.invalidateQueries({ queryKey: ["winners"] });
      qc.invalidateQueries({ queryKey: QK.DASHBOARD_METRICS() });
      onOpenChange(false);
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Failed to confirm winners"),
  });

  const toggle = (uid: string) => {
    setUnchecked((prev) => {
      const n = new Set(prev);
      if (n.has(uid)) n.delete(uid);
      else n.add(uid);
      return n;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            Select {examType.toUpperCase()} {periodType} winners
          </DialogTitle>
          <DialogDescription>
            Period starting {periodStart}. Uncheck any flagged or suspicious
            accounts before confirming.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-96 overflow-y-auto border-y border-slate-100">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>#</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="text-right">Weekly XP</TableHead>
                <TableHead className="text-right">Account age</TableHead>
                <TableHead className="text-right">Answered</TableHead>
                <TableHead>Anti-cheat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                </TableRow>
              )}
              {data?.map((c) => (
                <TableRow
                  key={c.userId}
                  className={unchecked.has(c.userId) ? "opacity-50" : ""}
                >
                  <TableCell>
                    <Checkbox
                      checked={!unchecked.has(c.userId)}
                      onCheckedChange={() => toggle(c.userId)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{c.rank}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar>
                        <AvatarFallback>{initials(c.fullName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{c.fullName}</div>
                        {!c.verified && (
                          <div className="text-xs text-slate-500">Unverified</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(c.weeklyXp)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-slate-600">
                    {c.accountAgeDays}d
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(c.questionsAnswered)}
                  </TableCell>
                  <TableCell>
                    {c.antiCheatPass ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 text-sm">
                        <Shield className="h-3.5 w-3.5" /> Pass
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-700 text-sm">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        {c.antiCheatReason ?? "Flagged"}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            loading={confirmMut.isPending}
            onClick={() => confirmMut.mutate()}
          >
            Confirm and issue XP prizes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
