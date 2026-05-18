"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Per-route error boundary (§9.3 layer 3). Swallows unhandled page errors
 * and offers a retry without blowing up the whole admin shell.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production this is where Sentry would be pinged.
    // eslint-disable-next-line no-console
    console.error("[admin:error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-rose-700">
            <TriangleAlert className="h-5 w-5" /> Something went wrong
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-slate-600">
            {error.message || "An unexpected error occurred rendering this page."}
          </p>
          {process.env.NODE_ENV === "development" && error.stack && (
            <pre className="max-h-48 overflow-auto rounded bg-slate-100 p-3 text-[11px] text-slate-700">
              {error.stack}
            </pre>
          )}
          <div className="flex justify-end">
            <Button onClick={reset}>Try again</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
