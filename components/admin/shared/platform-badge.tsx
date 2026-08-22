import { Badge } from "@/components/ui/badge";
import { Globe, Smartphone, Apple, Shield } from "lucide-react";

/**
 * Render a platform pill (`web` / `ios` / `android` / `admin-web`) for
 * rows sourced from `users.signup_platform` or `auth_login_events`.
 *
 * Null is a real value — legacy clients (and any request that lands
 * without an X-Platform header) get stored as null. Render it as a
 * distinct "Unknown" pill instead of a blank cell so nothing silently
 * disappears from analytics.
 */
export function PlatformBadge({ platform }: { platform: string | null }) {
  const key = (platform ?? "").toLowerCase();
  switch (key) {
    case "web":
      return (
        <Badge variant="indigo" className="gap-1">
          <Globe className="h-3 w-3" />
          Web
        </Badge>
      );
    case "ios":
      return (
        <Badge variant="default" className="gap-1">
          <Apple className="h-3 w-3" />
          iOS
        </Badge>
      );
    case "android":
      return (
        <Badge variant="success" className="gap-1">
          <Smartphone className="h-3 w-3" />
          Android
        </Badge>
      );
    case "admin-web":
      return (
        <Badge variant="warning" className="gap-1">
          <Shield className="h-3 w-3" />
          Admin
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-slate-500">
          Unknown
        </Badge>
      );
  }
}

export const PLATFORM_ORDER = ["web", "ios", "android", "admin-web", null] as const;

export function platformLabel(platform: string | null): string {
  const key = (platform ?? "").toLowerCase();
  if (key === "web") return "Web";
  if (key === "ios") return "iOS";
  if (key === "android") return "Android";
  if (key === "admin-web") return "Admin";
  return "Unknown";
}
