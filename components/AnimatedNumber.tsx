"use client";

import { useEffect, useRef, useState } from "react";
import { currency } from "@/lib/portfolio-utils";

export function AnimatedNumber({
  value,
  duration = 1600,
  formatter = currency.format,
  className = "",
  onStart,
  onEnd
}: {
  value: number;
  duration?: number;
  formatter?: (value: number) => string;
  className?: string;
  onStart?: () => void;
  onEnd?: () => void;
}) {
  const [display, setDisplay] = useState(0);
  const callbacks = useRef({ onStart, onEnd });
  callbacks.current = { onStart, onEnd };

  useEffect(() => {
    let frame = 0;
    let start: number | undefined;
    let ended = false;
    const easeOutExpo = (progress: number) => progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    callbacks.current.onStart?.();
    const tick = (timestamp: number) => {
      start ??= timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setDisplay(value * easeOutExpo(progress));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else if (!ended) {
        ended = true;
        callbacks.current.onEnd?.();
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, value]);

  return <span className={`data ${className}`}>{formatter(display)}</span>;
}
