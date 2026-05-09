import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-vault-black px-4 py-12 text-vault-text">
      <section className="mx-auto max-w-3xl rounded-lg border border-vault-border bg-vault-card p-6">
        <Link href="/" className="font-serif text-sm uppercase tracking-[0.24em] text-vault-gold">VAULT</Link>
        <p className="section-label mt-8">Terms</p>
        <h1 className="mt-3 font-serif text-5xl font-light">Use VAULT as a guide, not a guarantee.</h1>
        <p className="mt-5 text-sm leading-7 text-vault-muted">
          VAULT helps collectors organize items, track guide values, and store provenance records. Market values are estimates based on available data and are not appraisals, guarantees, investment advice, or offers to buy or sell.
        </p>
        <p className="mt-4 text-sm leading-7 text-vault-muted">
          You are responsible for the accuracy of what you add to your Vault and for protecting your account credentials. Contact hello@vaultcollection.org with questions.
        </p>
      </section>
    </main>
  );
}
