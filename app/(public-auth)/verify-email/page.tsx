"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PublicAuthBrand } from "../_brand-header";
import { publicAuthGet } from "../_api";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmail />
    </Suspense>
  );
}

type Phase = "verifying" | "success" | "error" | "no_token";

function VerifyEmail() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [phase, setPhase] = useState<Phase>(token ? "verifying" : "no_token");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Mobile handoff: detect a touch device and offer "Open in app" if
  // the mobile scheme is configured. Shown alongside the success
  // state so the user can land in the app if they want. Detected
  // lazily in a useState initializer (client-only `"use client"`
  // component) so we don't write to state from inside an effect —
  // a Next 16 / React Compiler rule violation.
  const mobileScheme = process.env.NEXT_PUBLIC_MOBILE_SCHEME;
  const [showAppHandoff] = useState(
    () =>
      Boolean(mobileScheme) &&
      Boolean(token) &&
      typeof navigator !== "undefined" &&
      /android|iphone|ipad|ipod/i.test(navigator.userAgent ?? ""),
  );

  // Auto-verify on mount. The backend endpoint is GET (browsers
  // following the email link should be able to land here and have
  // the verification complete without any user action).
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        await publicAuthGet(
          `/auth/email/verify?token=${encodeURIComponent(token)}`,
        );
        if (!cancelled) setPhase("success");
      } catch (err) {
        if (cancelled) return;
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "The verification link is invalid or has expired.",
        );
        setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (phase === "no_token") {
    return (
      <Card className="shadow-sm">
        <CardContent className="pt-6 pb-6">
          <PublicAuthBrand
            title="Verification link is invalid"
            description="This link is missing its verification token."
          />
          <Button asChild className="w-full">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (phase === "verifying") {
    return (
      <Card className="shadow-sm">
        <CardContent className="pt-6 pb-6">
          <PublicAuthBrand
            title="Verifying your email…"
            description="Just a moment while we confirm your address."
          />
          <div className="flex items-center justify-center py-2">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (phase === "error") {
    return (
      <Card className="shadow-sm">
        <CardContent className="pt-6 pb-6">
          <PublicAuthBrand
            title="Couldn't verify your email"
            description="The verification link is invalid or has expired."
          />
          {errorMessage ? (
            <div className="mb-4 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : null}
          <p className="text-sm text-slate-600 mb-4">
            Sign in and we&apos;ll let you resend the verification email from
            your account settings.
          </p>
          <Button asChild className="w-full">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // success
  return (
    <Card className="shadow-sm">
      <CardContent className="pt-6 pb-6">
        <PublicAuthBrand
          title="Email verified"
          description="Your address is confirmed — you're all set."
        />
        <div className="mb-4 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Welcome to Bondzi! You can close this tab.</span>
        </div>

        {showAppHandoff && mobileScheme ? (
          <div className="mb-4 flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
            <div className="flex items-center gap-2 text-slate-700">
              <Smartphone className="h-4 w-4" />
              <span className="font-medium">Back to the Bondzi app</span>
            </div>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="self-start"
            >
              <a href={`${mobileScheme}://verify-email?verified=1`}>
                Open Bondzi app
              </a>
            </Button>
          </div>
        ) : null}

        <Button asChild variant="outline" className="w-full">
          <Link href="/login">Sign in on web</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
