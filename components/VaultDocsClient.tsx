"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { categoryLabel, getCompletenessScore } from "@/lib/portfolio-utils";
import { useVaultStore } from "@/lib/vault-store";

export function VaultDocsClient() {
  const items = useVaultStore((state) => state.items);
  const docs = items.flatMap((item) => item.documents.map((document) => ({ document, item })));

  return (
    <AppShell>
      <section className="mb-8">
        <p className="section-label">Provenance Vault</p>
        <h1 className="mt-3 font-serif text-6xl font-light text-vault-text">The permanent record of what you own.</h1>
      </section>
      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="vault-panel rounded-lg p-5">
          <p className="section-label">All Documents</p>
          <div className="mt-5 space-y-3">
            {docs.map(({ document, item }) => (
              <Link href={`/collection/${item.id}`} key={document.id} className="flex items-center justify-between rounded-md border border-vault-border bg-vault-surface p-4 transition hover:border-vault-bright">
                <span className="flex items-center gap-3 text-sm text-vault-text"><FileText size={16} className="text-vault-gold" />{document.filename}</span>
                <span className="text-xs text-vault-muted">{item.name}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="vault-panel rounded-lg p-5">
          <p className="section-label">Completeness by Item</p>
          <div className="mt-5 space-y-4">
            {items.map((item) => (
              <div key={item.id}>
                <div className="flex justify-between text-sm"><span className="text-vault-text">{item.name}</span><span className="data text-vault-gold">{getCompletenessScore(item)}%</span></div>
                <div className="mt-2 h-2 rounded-full bg-vault-surface"><div className="h-full rounded-full bg-vault-gold" style={{ width: `${getCompletenessScore(item)}%` }} /></div>
                <p className="mt-1 text-xs text-vault-faint">{categoryLabel(item.category)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
