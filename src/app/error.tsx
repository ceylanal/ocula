"use client";

import { AppErrorView } from "@/components/AppErrorView";

export default function RouteError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <AppErrorView {...props} />;
}
