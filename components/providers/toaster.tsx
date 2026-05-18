"use client";

import { Toaster as HotToaster } from "react-hot-toast";

export function Toaster() {
  return (
    <HotToaster
      position="top-right"
      toastOptions={{
        style: {
          fontSize: "13px",
          padding: "8px 12px",
          borderRadius: "8px",
          background: "#0f172a",
          color: "#fff",
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
