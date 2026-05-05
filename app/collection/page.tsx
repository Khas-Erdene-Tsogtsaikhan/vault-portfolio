import { AppShell } from "@/components/AppShell";
import { CollectionTable } from "@/components/CollectionTable";

export default function CollectionPage() {
  return (
    <AppShell>
      <section className="mb-8">
        <p className="section-label">Full Collection</p>
        <h1 className="mt-3 font-serif text-6xl font-light text-vault-text">Every position in your physical portfolio.</h1>
        <p className="mt-4 max-w-2xl text-vault-muted">Filter, sort, and inspect the assets that make up your VAULT.</p>
      </section>
      <CollectionTable />
    </AppShell>
  );
}
