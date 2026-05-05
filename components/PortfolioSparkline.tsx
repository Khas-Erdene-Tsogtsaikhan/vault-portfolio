"use client";

import { motion } from "framer-motion";

export function PortfolioSparkline({ data, height = 180 }: { data: { value: number }[]; height?: number }) {
  const width = 680;
  const values = data.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = data.map((point, index) => {
    const x = (index / Math.max(data.length - 1, 1)) * width;
    const y = height - ((point.value - min) / range) * (height - 28) - 14;
    return `${x},${y}`;
  });
  const line = points.join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" role="img" aria-label="12 month portfolio value chart">
      {[0, 1, 2].map((index) => (
        <line key={index} x1="0" x2={width} y1={(height / 3) * index + 12} y2={(height / 3) * index + 12} stroke="rgba(255,255,255,0.06)" />
      ))}
      <motion.polyline
        points={line}
        fill="none"
        stroke="#c9a84c"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.25, ease: "easeOut" }}
      />
    </svg>
  );
}
