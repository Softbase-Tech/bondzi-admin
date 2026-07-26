import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/providers/auth-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/providers/toaster";
import "./globals.css";

/*
 * Runs before first paint (blocking, in <head>) so the correct theme is
 * on <html> before the body renders — no flash of the wrong theme. Reads
 * the stored choice; falls back to the OS preference (the default). Kept
 * dependency-free and inlined; mirrors the logic in ThemeProvider.
 */
const themeScript = `(function(){try{var t=localStorage.getItem("bondzi-theme");var d=t==="dark"||((!t||t==="system")&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bondzi Admin",
  description: "Internal command centre for Bondzi Ghana",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      {/*
        suppressHydrationWarning on <body>: some browser extensions (e.g.
        ColorZilla injecting `cz-shortcut-listen`) add attributes to body
        before React hydrates. React flags the mismatch even though it's
        benign — this silences the noise without hiding real mismatches
        inside the tree.
      */}
      <body
        className="min-h-full bg-slate-50 text-slate-900"
        suppressHydrationWarning
      >
        <ThemeProvider>
          <AuthProvider>
            <QueryProvider>{children}</QueryProvider>
          </AuthProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
