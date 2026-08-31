"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Plus } from "lucide-react";
import { QK } from "@/lib/query-keys";
import { createTermsVersion, listTerms } from "@/lib/partners/api";
import { PageHeader } from "@/components/admin/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";

/**
 * Terms editor. Reads every existing version (newest first) + a form
 * to publish the next one. Publishing broadcasts PARTNER_TERMS_UPDATED
 * to every ACTIVE partner in-flight — so the admin needs to write the
 * change_summary carefully.
 */
export default function PartnersTermsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: QK.PARTNER_TERMS_LIST(),
    queryFn: listTerms,
  });
  const [drafting, setDrafting] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Partner terms"
        description="Immutable versions of the partner agreement. Publishing broadcasts an email to every active partner."
        actions={
          <Button onClick={() => setDrafting((v) => !v)}>
            <Plus size={14} className="mr-1" />
            {drafting ? "Cancel draft" : "New version"}
          </Button>
        }
      />

      {drafting ? (
        <DraftForm
          onCancel={() => setDrafting(false)}
          onPublished={() => {
            setDrafting(false);
            void qc.invalidateQueries({ queryKey: QK.PARTNER_TERMS_LIST() });
          }}
        />
      ) : null}

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (data?.length ?? 0) === 0 ? (
        <Card className="p-6 text-sm text-slate-500">
          No terms rows yet. Seed the first version to unblock partner
          registration.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Effective</TableHead>
                <TableHead>WASSCE / NOVDEC / BECE</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Bonus</TableHead>
                <TableHead>Window (d)</TableHead>
                <TableHead>Fraud / Appeals</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data!.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-slate-900">
                    v{t.version}
                  </TableCell>
                  <TableCell className="text-slate-900">{t.title}</TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {formatDateTime(t.effectiveFrom)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {t.plusWassce} / {t.plusNovdec} / {t.plusBece}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {t.signupBatchAmountGhs} × {t.signupBatchSize}
                    <span className="text-slate-500">
                      {" "}
                      (≥ {t.signupMinCompletedAnswers})
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {t.answersBonusAmountGhs} @ {t.answersBonusThreshold}
                  </TableCell>
                  <TableCell>{t.attributionWindowDays}</TableCell>
                  <TableCell>
                    {t.maxFraudFlagsBeforeBlock} / {t.maxAppeals}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

// -------------------------- Draft form ---------------------------

function DraftForm({
  onCancel,
  onPublished,
}: {
  onCancel: () => void;
  onPublished: () => void;
}) {
  const [form, setForm] = useState({
    title: "",
    bodyMd: "",
    changeSummary: "",
    plusWassce: "30.00",
    plusNovdec: "30.00",
    plusBece: "15.00",
    signupBatchSize: 10,
    signupBatchAmountGhs: "20.00",
    signupMinCompletedAnswers: 40,
    answersBonusThreshold: 100,
    answersBonusAmountGhs: "2.00",
    attributionWindowDays: 90,
    maxFraudFlagsBeforeBlock: 3,
    maxAppeals: 3,
    effectiveFrom: "",
  });

  const publishMut = useMutation({
    mutationFn: () =>
      createTermsVersion({
        title: form.title.trim(),
        bodyMd: form.bodyMd.trim(),
        changeSummary: form.changeSummary.trim(),
        plusWassce: form.plusWassce,
        plusNovdec: form.plusNovdec,
        plusBece: form.plusBece,
        signupBatchSize: form.signupBatchSize,
        signupBatchAmountGhs: form.signupBatchAmountGhs,
        signupMinCompletedAnswers: form.signupMinCompletedAnswers,
        answersBonusThreshold: form.answersBonusThreshold,
        answersBonusAmountGhs: form.answersBonusAmountGhs,
        attributionWindowDays: form.attributionWindowDays,
        maxFraudFlagsBeforeBlock: form.maxFraudFlagsBeforeBlock,
        maxAppeals: form.maxAppeals,
        effectiveFrom: form.effectiveFrom
          ? new Date(form.effectiveFrom).toISOString()
          : undefined,
      }),
    onSuccess: () => {
      toast.success("Version published and broadcast started");
      onPublished();
    },
    onError: (err: { message?: string }) =>
      toast.error(err.message ?? "Failed to publish"),
  });

  const canPublish =
    form.title.trim().length > 2 &&
    form.bodyMd.trim().length > 20 &&
    form.changeSummary.trim().length > 10;

  return (
    <Card className="p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-900">
        Publish new version
      </h2>
      <p className="text-xs text-slate-500">
        Every active partner will receive PARTNER_TERMS_UPDATED with your
        change summary. Existing commissions stay pinned to their earn-time
        version — this only affects future earnings.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Effective from (optional — defaults to now)</Label>
          <Input
            type="datetime-local"
            value={form.effectiveFrom}
            onChange={(e) =>
              setForm({ ...form, effectiveFrom: e.target.value })
            }
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Change summary (shown in the email)</Label>
        <Textarea
          rows={3}
          value={form.changeSummary}
          onChange={(e) =>
            setForm({ ...form, changeSummary: e.target.value })
          }
          placeholder="Bumped Plus WASSCE payout from 30 to 35."
        />
      </div>
      <div className="space-y-2">
        <Label>Full terms body (markdown)</Label>
        <Textarea
          rows={10}
          value={form.bodyMd}
          onChange={(e) => setForm({ ...form, bodyMd: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <NumField
          label="Plus WASSCE (GHS)"
          value={form.plusWassce}
          onChange={(v) => setForm({ ...form, plusWassce: v })}
        />
        <NumField
          label="Plus NOVDEC (GHS)"
          value={form.plusNovdec}
          onChange={(v) => setForm({ ...form, plusNovdec: v })}
        />
        <NumField
          label="Plus BECE (GHS)"
          value={form.plusBece}
          onChange={(v) => setForm({ ...form, plusBece: v })}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <NumField
          label="Signup batch size"
          type="int"
          value={String(form.signupBatchSize)}
          onChange={(v) =>
            setForm({ ...form, signupBatchSize: Number(v) || 10 })
          }
        />
        <NumField
          label="Signup batch amount (GHS)"
          value={form.signupBatchAmountGhs}
          onChange={(v) =>
            setForm({ ...form, signupBatchAmountGhs: v })
          }
        />
        <NumField
          label="Signup min answers"
          type="int"
          value={String(form.signupMinCompletedAnswers)}
          onChange={(v) =>
            setForm({ ...form, signupMinCompletedAnswers: Number(v) || 40 })
          }
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <NumField
          label="Answers bonus threshold"
          type="int"
          value={String(form.answersBonusThreshold)}
          onChange={(v) =>
            setForm({ ...form, answersBonusThreshold: Number(v) || 100 })
          }
        />
        <NumField
          label="Answers bonus (GHS)"
          value={form.answersBonusAmountGhs}
          onChange={(v) =>
            setForm({ ...form, answersBonusAmountGhs: v })
          }
        />
        <NumField
          label="Attribution window (days)"
          type="int"
          value={String(form.attributionWindowDays)}
          onChange={(v) =>
            setForm({ ...form, attributionWindowDays: Number(v) || 90 })
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <NumField
          label="Max fraud flags before block"
          type="int"
          value={String(form.maxFraudFlagsBeforeBlock)}
          onChange={(v) =>
            setForm({ ...form, maxFraudFlagsBeforeBlock: Number(v) || 3 })
          }
        />
        <NumField
          label="Max appeals"
          type="int"
          value={String(form.maxAppeals)}
          onChange={(v) => setForm({ ...form, maxAppeals: Number(v) || 3 })}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={() => publishMut.mutate()}
          disabled={!canPublish || publishMut.isPending}
        >
          {publishMut.isPending ? "Publishing…" : "Publish version"}
        </Button>
      </div>
    </Card>
  );
}

function NumField({
  label,
  value,
  onChange,
  type = "decimal",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "int" | "decimal";
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type="text"
        inputMode={type === "int" ? "numeric" : "decimal"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
