"use client";

import { useEffect, useState } from "react";
import { currency } from "@/lib/portfolio-utils";

export function AnimatedNumber({ value, duration = 1600, formatter = currency.format, className = "" }: { value: number; duration?: number; formatter?: (value: number) => string; className?: string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let frame = 0;
    let start: number | undefined;
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    const tick = (timestamp: number) => {
      start ??= timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setDisplay(value * easeOutCubic(progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, value]);

  return <span className={`data ${className}`}>{formatter(display)}</span>;
}
