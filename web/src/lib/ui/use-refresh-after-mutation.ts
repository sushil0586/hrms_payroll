"use client";

import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";

export function useRefreshAfterMutation() {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const refresh = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router]);

  return { isRefreshing, refresh };
}
