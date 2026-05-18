"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Send } from "lucide-react";
import { api } from "@/lib/api";
import {
  notificationSchema,
  type NotificationFormData,
} from "@/lib/validators/notification";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/admin/layout/page-header";

export default function NotificationsPage() {
  const form = useForm<NotificationFormData>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      title: "",
      body: "",
      channels: ["in_app"],
      segment: "all",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: NotificationFormData) =>
      api.post("/admin/notifications", data),
    onSuccess: () => {
      toast.success("Notification queued");
      form.reset();
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const channels = form.watch("channels");

  function toggleChannel(ch: "push" | "sms" | "in_app") {
    const set = new Set(channels);
    set.has(ch) ? set.delete(ch) : set.add(ch);
    form.setValue("channels", [...set] as NotificationFormData["channels"], {
      shouldValidate: true,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Notifications"
        description="Send a targeted push/SMS/in-app message. Dispatched via BullMQ."
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Compose</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit((d) => mutation.mutate(d))}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title">Title</Label>
              <Input id="title" {...form.register("title")} />
              {form.formState.errors.title && (
                <p className="text-xs text-rose-600">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="body">Body</Label>
              <Textarea id="body" rows={4} {...form.register("body")} />
              {form.formState.errors.body && (
                <p className="text-xs text-rose-600">
                  {form.formState.errors.body.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Channels</Label>
              <div className="flex gap-4">
                {(["push", "sms", "in_app"] as const).map((ch) => (
                  <label key={ch} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={channels.includes(ch)}
                      onCheckedChange={() => toggleChannel(ch)}
                    />
                    <span className="capitalize">{ch.replace("_", " ")}</span>
                  </label>
                ))}
              </div>
              {form.formState.errors.channels && (
                <p className="text-xs text-rose-600">
                  {form.formState.errors.channels.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Segment</Label>
              <Select
                value={form.watch("segment")}
                onValueChange={(v: NotificationFormData["segment"]) =>
                  form.setValue("segment", v)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  <SelectItem value="free">Free tier</SelectItem>
                  <SelectItem value="paid">Paid tier</SelectItem>
                  <SelectItem value="expiring_soon">
                    Expiring this week
                  </SelectItem>
                  <SelectItem value="custom">Custom (advanced)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end">
              <Button type="submit" loading={mutation.isPending}>
                <Send className="h-4 w-4" /> Send
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
