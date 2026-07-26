"use client";

import { Toaster as HotToaster } from "react-hot-toast";

export function Toaster() {
  return (
    <HotToaster
      position="top-right"
      toastOptions={{
        // Inverted surface (dark toast on light UI, light toast on dark
        // UI) via the theme tokens, so toasts follow the theme class.
        style: {
          fontSize: "13px",
          padding: "8px 12px",
          borderRadius: "8px",
          background: "var(--color-foreground)",
          color: "var(--color-background)",
        },
        success: {
          iconTheme: { primary: "#10b981", secondary: "#fff" },
        },
        error: {
          iconTheme: { primary: "#e11d48", secondary: "#fff" },
        },
      }}
    />
  );
}
