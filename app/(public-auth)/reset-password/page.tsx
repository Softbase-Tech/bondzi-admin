"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, KeyRound, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { PublicAuthBrand } from "../_brand-header";
import { publicAuthPost } from "../_api";

// Password rule must match backend's reset-password DTO (auth.controller.ts
// → ResetPasswordDto). Reasonable browser-side guard so the user sees the
// failure inline instead of round-tripping a 400.
const schema = z
  .object({
    password: z
      .string()
      .min(8, "At least 8 characters")
      .max(128, "Too long"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords don't match",
    path: ["confirm"],
  });
type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}

function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Mobile handoff: detect a touch device on mount and offer
  // "Open in app" when the mobile scheme is configured. Desktop /
  // unknown UAs stay on the web form. Detected in a useState
  // initializer so we don't write to state from inside an effect —
  // a Next 16 / React Compiler rule violation.
  const mobileScheme = process.env.NEXT_PUBLIC_MOBILE_SCHEME;
  const [showAppHandoff] = useState(
    () =>
      Boolean(mobileScheme) &&
      Boolean(token) &&
      typeof navigator !== "undefined" &&
      /android|iphone|ipad|ipod/i.test(navigator.userAgent ?? ""),
  );

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  });

  // Token MUST be present — without it the form can't submit anything
  // meaningful. Surface a clear "your link is broken" state instead of
  // showing the form and letting the user type a password that goes
  // nowhere.
  if (!token) {
    return (
      <Card className="shadow-sm">
        <CardContent className="pt-6 pb-6">
          <PublicAuthBrand
            title="Reset link is invalid"
            description="This link is missing its reset token. Request a new one."
          />
          <Button asChild className="w-full">
            <Link href="/forgot-password">Get a fresh reset link</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  async function onSubmit(data: FormData) {
    setSubmitError(null);
    try {
      await publicAuthPost("/auth/reset-password", {
        token,
        password: data.password,
      });
      setDone(true);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Couldn't reset your password. The link may have expired.",
      );
    }
  }

  if (done) {
    return (
      <Card className="shadow-sm">
        <CardContent className="pt-6 pb-6">
          <PublicAuthBrand
            title="Password updated"
            description="You can now sign in with your new password."
          />
          <Button asChild className="w-full">
            <Link href="/login">
              <CheckCircle2 className="h-4 w-4" />
              Sign in
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardContent className="pt-6 pb-6">
        <PublicAuthBrand
          title="Set a new password"
          description="Choose a strong password you'll remember."
        />

        {showAppHandoff && mobileScheme ? (
          <div className="mb-4 flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
            <div className="flex items-center gap-2 text-slate-700">
              <Smartphone className="h-4 w-4" />
              <span className="font-medium">On the Bondzi app already?</span>
            </div>
            <p className="text-xs text-slate-500">
              Tap below to finish in the app — your password reset will pick
              up where you left off.
            </p>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="self-start"
            >
              <a
                href={`${mobileScheme}://reset-password?token=${encodeURIComponent(token)}`}
              >
                Open in Bondzi app
              </a>
            </Button>
          </div>
        ) : null}

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-3"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              autoFocus
              {...form.register("password")}
            />
            {form.formState.errors.password && (
              <p className="text-xs text-rose-600">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              {...form.register("confirm")}
            />
            {form.formState.errors.confirm && (
              <p className="text-xs text-rose-600">
                {form.formState.errors.confirm.message}
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
            <KeyRound className="h-4 w-4" />
            Set new password
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
