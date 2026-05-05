"use client";

import { motion } from "framer-motion";
import { categoryLabel, compactCurrency, percent } from "@/lib/portfolio-utils";
import type { getCategoryBreakdown } from "@/lib/portfolio-utils";

type Breakdown = ReturnType<typeof getCategoryBreakdown>;

export function CategoryBars({ data }: { data: Breakdown }) {
  return (
    <section className="vault-panel rounded-[10px] p-6">
      <div className="mb-5 flex items-center justify-between">
        <p className="section-label">Category Allocation</p>
        <span className="data text-[10px] text-vault-faint">WEIGHT</span>
      </div>
      <div className="space-y-3.5">
        {data.map((item, index) => (
          <div key={item.category} className="flex items-center gap-2.5">
            <span className="h-1.5 w-1.5 shrink-0 rounded-sm bg-vault-gold" />
            <span className="min-w-[72px] flex-1 text-xs text-vault-muted">{categoryLabel(item.category)}</span>
            <div className="h-[3px] flex-[2] overflow-hidden rounded-full bg-vault-border">
              <motion.div
                className="h-full rounded-full bg-vault-gold"
                initial={{ width: 0 }}
                animate={{ width: `${item.concentration * 100}%` }}
                transition={{ delay: index * 0.08, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <span className="data min-w-[70px] text-right text-xs text-vault-text">{compactCurrency.format(item.value)}</span>
            <span className="min-w-[34px] text-right text-[10px] text-vault-faint">{percent.format(item.concentration)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
