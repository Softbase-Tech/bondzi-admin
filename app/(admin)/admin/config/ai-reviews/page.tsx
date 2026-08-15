"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Sparkles } from "lucide-react";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { PageHeader } from "@/components/admin/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { AiReviewConfig } from "@/types/api";

/**
 * Monthly limits for the user-triggered AI Study Review. Reviews are
 * generated on demand (never auto), and the allowance does NOT carry
 * forward month to month. Free tier can't generate reviews at all, so
 * only Plus and Pro have a tunable limit here.
 */
export default function AiReviewsConfigPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: QK.AI_REVIEW_CONFIG(),
    queryFn: () => unwrap<AiReviewConfig>(api.get("/admin/config/ai-reviews")),
  });

  const [form, setForm] = useState<Partial<AiReviewConfig>>({});

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const saveMut = useMutation({
    mutationFn: () =>
      unwrap(
        api.patch("/admin/config/ai-reviews", {
          plusMonthlyLimit: form.plusMonthlyLimit,
          proMonthlyLimit: form.proMonthlyLimit,
        }),
      ),
    onSuccess: () => {
      toast.success("AI review limits saved");
      qc.invalidateQueries({ queryKey: QK.AI_REVIEW_CONFIG() });
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Save failed"),
  });

  const up = <K extends keyof AiReviewConfig>(key: K, value: AiReviewConfig[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="AI Study Reviews"
        description="Monthly generation limits per tier. Reviews are user-triggered (never auto) and the allowance does not carry forward — it resets on the 1st."
      />

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> Monthly limits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Plus — reviews per month</Label>
                  <Input
                    type="number"
                    min={0}
                    max={1000}
                    step={1}
                    value={form.plusMonthlyLimit ?? 10}
                    onChange={(e) =>
                      up("plusMonthlyLimit", Number(e.target.value))
                    }
                  />
                  <p className="text-xs text-slate-500">
                    How many AI reviews a Plus subscriber can generate each
                    calendar month. Default 10.
                  </p>
                </div>
                <div className="space-y-1">
                  <Label>Pro — reviews per month</Label>
                  <Input
                    type="number"
                    min={0}
                    max={1000}
                    step={1}
                    value={form.proMonthlyLimit ?? 30}
                    onChange={(e) =>
                      up("proMonthlyLimit", Number(e.target.value))
                    }
                  />
                  <p className="text-xs text-slate-500">
                    How many AI reviews a Pro subscriber can generate each
                    calendar month. Default 30.
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Free-tier students cannot generate reviews — they see an upgrade
                prompt instead, so there is no Free limit to set.
              </p>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button loading={saveMut.isPending} onClick={() => saveMut.mutate()}>
              Save limits
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
