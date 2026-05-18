import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Next.js 16 Proxy (formerly Middleware). File must live at the project root
 * named `proxy.ts`. Enforces role-based access BEFORE any page is rendered —
 * defence-in-depth layer #1 (§7.2 + §9.2). Route handlers and server actions
 * re-validate roles as layer #2.
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  if (pathname === "/" || pathname === "") {
    if (!session) return NextResponse.redirect(new URL("/login", req.url));
    const role = session.user.role;
    if (role === "teacher")
      return NextResponse.redirect(new URL("/school", req.url));
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  if (!session) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  const role = session.user.role;

  if (role === "student") {
    return NextResponse.redirect(new URL("/login?error=unauthorized", req.url));
  }

  if (role === "teacher" && pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/school", req.url));
  }

  if (
    (role === "admin" || role === "superadmin") &&
    pathname.startsWith("/school")
  ) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  if (session.user.error === "RefreshAccessTokenError") {
    return NextResponse.redirect(
      new URL("/login?error=session_expired", req.url),
    );
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Run on all routes EXCEPT:
    //   - api/auth        — NextAuth route handlers
    //   - _next/static    — webpack chunks
    //   - _next/image     — the Next image optimizer
    //   - favicon.ico     — favicon shortcut
    //   - login           — the login page itself (would loop)
    //   - brand           — `/public/brand/*` (logos shown on /login,
    //                       served directly via Image `unoptimized`).
    //                       Without this, the proxy redirects the
    //                       logo's GET to /login because the visitor
    //                       has no session yet and the broken image
    //                       silently kills branding on the auth pages.
    "/((?!api/auth|_next/static|_next/image|favicon.ico|login|brand).*)",
  ],
};
