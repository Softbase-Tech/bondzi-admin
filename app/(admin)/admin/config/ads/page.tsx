"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AlertTriangle, BarChart3, PlayCircle } from "lucide-react";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { PageHeader } from "@/components/admin/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdConfig } from "@/types/api";

export default function AdsConfigPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: QK.ADS_CONFIG(),
    queryFn: () => unwrap<AdConfig>(api.get("/admin/config/ads")),
  });

  const [form, setForm] = useState<Partial<AdConfig>>({});

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const saveMut = useMutation({
    mutationFn: () => unwrap(api.patch("/admin/config/ads", form)),
    onSuccess: () => {
      toast.success("Ads config saved");
      qc.invalidateQueries({ queryKey: QK.ADS_CONFIG() });
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Save failed"),
  });

  const up = <K extends keyof AdConfig>(key: K, value: AdConfig[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Ads (Phase 2)"
        description="AdMob configuration for free-tier users. Off by default."
      />

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Master toggle
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-md border border-slate-200 p-3">
                <div>
                  <div className="font-medium">Ads enabled for free users</div>
                  <div className="text-xs text-slate-500">
                    When off, no ads are served anywhere.
                  </div>
                </div>
                <Switch
                  checked={form.adsEnabled ?? false}
                  onCheckedChange={(v) => up("adsEnabled", v)}
                />
              </div>
              {form.adsEnabled && (
                <Alert variant="warning">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Ads are live for free users</AlertTitle>
                  <AlertDescription>
                    Ads will appear on the result screen after completed exams.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ad unit config</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Ad network</Label>
                  <Select
                    value={form.adNetwork ?? "admob"}
                    onValueChange={(v) => up("adNetwork", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admob">AdMob</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div />
              </div>

              <div className="space-y-1">
                <Label>AdMob App ID</Label>
                <Input
                  value={form.admobAppId ?? ""}
                  placeholder="ca-app-pub-…"
                  onChange={(e) => up("admobAppId", e.target.value || null)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Interstitial Ad Unit ID</Label>
                  <Input
                    value={form.admobInterstitialId ?? ""}
                    onChange={(e) =>
                      up("admobInterstitialId", e.target.value || null)
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Rewarded Ad Unit ID</Label>
                  <Input
                    value={form.admobRewardedId ?? ""}
                    onChange={(e) =>
                      up("admobRewardedId", e.target.value || null)
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rewarded & caps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Rewarded XP amount</Label>
                  <Input
                    type="number"
                    value={form.rewardedXpAmount ?? 5}
                    onChange={(e) =>
                      up("rewardedXpAmount", Number(e.target.value))
                    }
                  />
                  <p className="text-xs text-slate-500">
                    XP per completed rewarded ad.
                  </p>
                </div>
                <div className="space-y-1">
                  <Label>Frequency cap (per day)</Label>
                  <Input
                    type="number"
                    value={form.frequencyCap ?? 3}
                    onChange={(e) =>
                      up("frequencyCap", Number(e.target.value))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Trigger event</Label>
                  <Select
                    value={form.triggerEvent ?? "exam_complete"}
                    onValueChange={(v) => up("triggerEvent", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exam_complete">
                        exam_complete
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PlayCircle className="h-4 w-4" /> Preview — what free users see
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-600">
                <div className="mx-auto max-w-xs rounded-md border border-dashed border-slate-300 bg-white p-6">
                  <div className="text-slate-500 text-xs">
                    Exam result screen
                  </div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">
                    Score 82%
                  </div>
                  <div className="mt-4 rounded-md border border-primary/30 bg-accent p-3 text-xs text-primary-deep">
                    Sponsored ad placeholder — non-intrusive, post-result.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button loading={saveMut.isPending} onClick={() => saveMut.mutate()}>
              Save ads config
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
