import Image from "next/image";

/**
 * Brand block used by every public-auth page (forgot-password,
 * reset-password, verify-email). Mirrors the icon + wordmark
 * treatment of /login so a user arriving here from an email doesn't
 * feel like they fell off the brand.
 */
export function PublicAuthBrand({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-2 mb-6">
      <Image
        src="/brand/icon-black.png"
        alt="Bondzi"
        width={48}
        height={48}
        priority
        unoptimized
        className="h-12 w-12"
      />
      <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
      <p className="text-sm text-slate-500">{description}</p>
    </div>
  );
}
