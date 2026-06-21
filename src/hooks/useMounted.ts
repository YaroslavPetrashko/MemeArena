"use client";

import { useEffect, useState } from "react";

/** Returns true after the first client render — guards against SSR/localStorage hydration mismatch. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Intentional: flips once on mount to guard localStorage-backed state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  return mounted;
}
