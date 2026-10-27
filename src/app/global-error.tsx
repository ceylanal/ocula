"use client";

import { AppErrorView } from "@/components/AppErrorView";

// Kök düzen çöktüğünde devreye girer; kendi html/body'sini sağlamalıdır.
export default function GlobalError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="tr">
      <body style={{ background: "#F6F1E7", color: "#2C2520", fontFamily: "system-ui, sans-serif" }}>
        <AppErrorView {...props} />
      </body>
    </html>
  );
}
