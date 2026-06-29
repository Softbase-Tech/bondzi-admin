"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { PublicAuthBrand } from "../_brand-header";
import { publicAuthPost } from "../_api";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
});
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  // The backend always returns 204 on POST /auth/forgot-password
  // regardless of whether the email exists (anti-enumeration). We
  // mirror that on the client: a successful POST flips to the
  // "check your inbox" state without revealing whether an account
  // actually got an email.
  const [sent, setSent] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  async function onSubmit(data: FormData) {
    setSubmitError(null);
    try {
      await publicAuthPost("/auth/forgot-password", {
        email: data.email.trim().toLowerCase(),
      });
      setSent(true);
    } catch (err) {
      // The forgot-password endpoint is throttled — a 429 surfaces a
      // clear message here so the user knows to wait rather than
      // assuming the form is broken.
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Try again in a few minutes.",
      );
    }
  }

  if (sent) {
    return (
      <Card className="shadow-sm">
        <CardContent className="pt-6 pb-6">
          <PublicAuthBrand
            title="Check your email"
            description="If an account exists for that address, a password reset link is on its way."
          />
          <p className="text-sm text-slate-600 text-center mb-4">
            The link expires in <strong>30 minutes</strong>. Open it on
            this device to reset your password.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardContent className="pt-6 pb-6">
        <PublicAuthBrand
          title="Forgot your password?"
          description="Enter your account email and we'll send you a reset link."
        />
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-3"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p className="text-xs text-rose-600">
                {form.formState.errors.email.message}
              </p>
            )}
            {submitError && (
              <p className="text-xs text-rose-600">{submitError}</p>
            )}
          </div>
          <Button
            type="submit"
            loading={form.formState.isSubmitting}
            className="mt-2"
          >
            <Mail className="h-4 w-4" />
            Send reset link
          </Button>
          <Link
            href="/login"
            className="text-xs text-slate-500 hover:text-slate-700 text-center mt-2"
          >
            Back to sign in
          </Link>
        </form>
      </CardContent>
    </Card>
  );
}
