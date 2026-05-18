"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import toast from "react-hot-toast";
import Image from "next/image";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { loginSchema, type LoginFormData } from "@/lib/validators/login";
import { getOrCreateDeviceId } from "@/lib/device-id";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);

  // Capture the callbackUrl ONCE on mount and keep it stable for the
  // rest of the form's lifetime. The login session may have started
  // with `?callbackUrl=/admin/users` (proxy redirected the user from
  // a protected page) — that's the URL we want to land on after a
  // successful sign-in.
  const initialCallbackUrl = params.get("callbackUrl") ?? "/admin";

  useEffect(() => {
    const err = params.get("error");
    if (!err) return;
    if (err === "session_expired") {
      toast.error("Session expired — please sign in again.");
    } else if (err === "unauthorized") {
      toast.error("Students cannot access the admin dashboard.");
    }
    // CRITICAL: strip `error` from the URL right after showing the
    // toast. If we leave it, subsequent calls to `signIn("credentials",
    // { redirect: false })` default `callbackUrl` to
    // `window.location.href` — which includes `?error=session_expired`.
    // NextAuth then echoes that error back in the response URL even on
    // valid credentials, the `res.error` check below trips, and the
    // user sees "Invalid credentials" no matter what they type. The
    // toast already fired; we don't need the param any more.
    const url = new URL(window.location.href);
    url.searchParams.delete("error");
    router.replace(`${url.pathname}${url.search}`);
    // Intentionally only depends on the initial mount: re-running this
    // every params change would loop (we mutate the URL inside).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: LoginFormData) {
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email: data.email,
        password: data.password,
        deviceId: getOrCreateDeviceId(),
        // Pin the callbackUrl explicitly. Without this, NextAuth
        // defaults to window.location.href and any leftover query
        // params (including `?error=...`) leak into the auth flow
        // and trip the `res.error` check on the response.
        callbackUrl: initialCallbackUrl,
        redirect: false,
      });
      if (!res || res.error) {
        toast.error("Invalid credentials");
        return;
      }
      router.replace(initialCallbackUrl);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="items-center text-center">
        <Image
          src="/brand/icon-black.png"
          alt="Bondzi"
          width={48}
          height={48}
          priority
          unoptimized
          className="mx-auto mb-2 h-12 w-12"
        />
        <CardTitle className="text-lg">Bondzi Admin</CardTitle>
        <CardDescription>
          Internal dashboard. Students and teachers sign in elsewhere.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p className="text-xs text-rose-600">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...form.register("password")}
            />
            {form.formState.errors.password && (
              <p className="text-xs text-rose-600">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>
          <Button type="submit" loading={loading} className="mt-2">
            <Lock className="h-4 w-4" />
            Sign in
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
