"use client";

import Link from "next/link";
import { BadgeCheck, FileText, Image as ImageIcon } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { categoryLabel, getCompletenessScore } from "@/lib/portfolio-utils";
import { documentTypeLabels } from "@/lib/types";
import { useVaultStore } from "@/lib/vault-store";

export function VaultDocsClient() {
  const items = useVaultStore((state) => state.items);
  const docs = items.flatMap((item) => item.documents.map((document) => ({ document, item })));
  const photoCount = items.reduce((sum, item) => sum + item.photos.length, 0);
  const completeCount = items.filter((item) => getCompletenessScore(item) >= 80).length;

  return (
    <AppShell>
      <section className="mb-8">
        <p className="section-label">Provenance Vault</p>
        <h1 className="mt-3 font-serif text-4xl font-light leading-none text-vault-text sm:text-6xl">The permanent record of what you own.</h1>
        <p className="mt-4 max-w-3xl text-vault-muted">A documented asset commands more trust. Keep owner photos, original receipts, certificates of authenticity, and appraisal records attached to every position.</p>
      </section>
      <section className="mb-6 grid gap-3 md:grid-cols-3">
        <StatCard icon={FileText} label="Documents Stored" value={String(docs.length)} detail="Receipts, certificates, appraisals" />
        <StatCard icon={ImageIcon} label="Photos Stored" value={String(photoCount)} detail="Default market images plus owner proof" />
        <StatCard icon={BadgeCheck} label="Strong Files" value={String(completeCount)} detail="Assets above 80% provenance depth" />
      </section>
      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="vault-panel rounded-lg p-5">
          <p className="section-label">All Documents</p>
          <div className="mt-5 space-y-3">
            {docs.map(({ document, item }) => (
              <Link href={`/collection/${item.id}`} key={document.id} className="flex min-w-0 flex-col gap-3 rounded-md border border-vault-border bg-vault-surface p-4 transition hover:border-vault-bright sm:flex-row sm:items-center sm:justify-between">
                <span className="flex min-w-0 items-center gap-3 text-sm text-vault-text">
                  <FileText size={16} className="shrink-0 text-vault-gold" />
                  <span className="min-w-0">
                    <span className="block truncate">{document.filename}</span>
                    <span className="mt-1 inline-flex rounded border border-vault-border bg-vault-black px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-vault-muted">{documentTypeLabels[document.type]}</span>
                  </span>
                </span>
                <span className="min-w-0 truncate text-xs text-vault-muted sm:shrink-0 sm:pl-4">{item.name}</span>
              </Link>
            ))}
            {!docs.length ? <p className="rounded-md border border-dashed border-vault-border p-5 text-sm leading-6 text-vault-muted">No documents yet. Open any asset file from Collection and attach a receipt, certificate, appraisal, or authenticity record.</p> : null}
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

function StatCard({ icon: Icon, label, value, detail }: { icon: typeof FileText; label: string; value: string; detail: string }) {
  return (
    <article className="vault-panel rounded-lg p-5">
      <Icon size={18} className="text-vault-gold" />
      <p className="section-label mt-4">{label}</p>
      <p className="data mt-2 text-3xl text-vault-text">{value}</p>
      <p className="mt-2 text-xs leading-5 text-vault-muted">{detail}</p>
    </article>
  );
}
