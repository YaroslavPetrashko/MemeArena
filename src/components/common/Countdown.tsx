"use client";

import { useEffect, useState } from "react";
import { formatCountdown } from "@/lib/utils/format";

export function Countdown({ to, className }: { to: Date; className?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return <span className={className}>{formatCountdown(to.getTime() - now)}</span>;
}
