import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-vault-black px-4 py-12 text-vault-text">
      <section className="mx-auto max-w-3xl rounded-lg border border-vault-border bg-vault-card p-6">
        <Link href="/" className="font-serif text-sm uppercase tracking-[0.24em] text-vault-gold">VAULT</Link>
        <p className="section-label mt-8">Privacy Policy</p>
        <h1 className="mt-3 font-serif text-5xl font-light">Your collection data is yours.</h1>
        <p className="mt-5 text-sm leading-7 text-vault-muted">
          VAULT stores account, portfolio, item, photo, document, and notification data so the product can track your collection. We do not sell your personal collection data.
        </p>
        <p className="mt-4 text-sm leading-7 text-vault-muted">
          Guide values may come from external market data providers such as PriceCharting. Actual sale prices may vary. Contact hello@vaultcollection.org for privacy questions or data requests.
        </p>
      </section>
    </main>
  );
}
