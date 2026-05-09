"use client";

import { Mail } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { buildWeeklyDigest, defaultNotificationPrefs } from "@/lib/notifications";
import { currency, getItemDailyDelta } from "@/lib/portfolio-utils";
import type { NotificationPreferences } from "@/lib/types";
import { useVaultStore } from "@/lib/vault-store";

export function SettingsClient() {
  const user = useVaultStore((state) => state.user);
  const items = useVaultStore((state) => state.items);
  const prefs = useVaultStore((state) => state.notificationPrefs ?? defaultNotificationPrefs);
  const events = useVaultStore((state) => state.notificationEvents ?? []);
  const updateNotificationPrefs = useVaultStore((state) => state.updateNotificationPrefs);
  const markNotificationRead = useVaultStore((state) => state.markNotificationRead);
  const digest = buildWeeklyDigest(user, items);

  return (
    <AppShell>
      <section className="mb-8">
        <p className="section-label">Settings</p>
        <h1 className="mt-3 font-serif text-4xl font-light leading-none text-vault-text sm:text-6xl">Control the rhythm of your Vault.</h1>
        <p className="mt-4 max-w-2xl text-vault-muted">Tune alerts, digest timing, and the way your collection checks in with you.</p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_430px]">
        <div className="space-y-6">
          <div className="vault-panel rounded-lg p-5">
            <p className="section-label">Notification Preferences</p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <Toggle label="All-time high" checked={prefs.notifyPriceAth} onChange={(value) => updateNotificationPrefs({ notifyPriceAth: value })} />
              <Toggle label="Market moves" checked={prefs.notifyMarketMoves} onChange={(value) => updateNotificationPrefs({ notifyMarketMoves: value })} />
              <Toggle label="Offer received" checked={prefs.notifyOfferReceived} onChange={(value) => updateNotificationPrefs({ notifyOfferReceived: value })} />
              <Toggle label="Daily digest" checked={prefs.notifyDigestDaily} onChange={(value) => updateNotificationPrefs({ notifyDigestDaily: value })} />
              <Toggle label="Weekly digest" checked={prefs.notifyDigestWeekly} onChange={(value) => updateNotificationPrefs({ notifyDigestWeekly: value })} />
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <NumberPref label="Alert when item rises" value={prefs.notifyPriceUpPct} suffix="%" onChange={(value) => updateNotificationPrefs({ notifyPriceUpPct: value })} />
              <NumberPref label="Alert when item dips" value={prefs.notifyPriceDownPct} suffix="%" onChange={(value) => updateNotificationPrefs({ notifyPriceDownPct: value })} />
              <TimePref label="Quiet hours start" value={prefs.quietHoursStart} onChange={(value) => updateNotificationPrefs({ quietHoursStart: value })} />
              <TimePref label="Quiet hours end" value={prefs.quietHoursEnd} onChange={(value) => updateNotificationPrefs({ quietHoursEnd: value })} />
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="vault-panel rounded-lg p-5">
            <p className="section-label">Notification Queue</p>
            <div className="mt-5 space-y-3">
              {events.length ? events.slice(0, 8).map((event) => (
                <button key={event.id} onClick={() => markNotificationRead(event.id)} className={`block w-full rounded-md border p-4 text-left transition hover:border-vault-bright ${event.readAt ? "border-vault-border bg-vault-surface opacity-70" : "border-vault-gold/30 bg-vault-gold/10"}`}>
                  <span className="flex items-start justify-between gap-3">
                    <span className="font-medium text-vault-text">{event.title}</span>
                    <span className="rounded bg-vault-black px-2 py-1 font-mono text-[9px] uppercase text-vault-muted">{event.priority}</span>
                  </span>
                  <span className="mt-2 block text-xs leading-5 text-vault-muted">{event.body}</span>
                </button>
              )) : <p className="rounded-md border border-vault-border bg-vault-surface p-4 text-sm text-vault-muted">No notification events yet. Run checks after a price refresh to queue alerts.</p>}
            </div>
          </div>

          <div className="vault-panel rounded-lg p-5">
            <p className="section-label">Weekly Email Digest</p>
            <h2 className="mt-3 text-xl font-semibold text-vault-text">{digest.subject}</h2>
            <p className="mt-3 text-sm leading-6 text-vault-muted">{digest.portfolioLine}</p>
            <div className="mt-5 space-y-3">
              {digest.movers.map((item) => {
                const daily = getItemDailyDelta(item);
                return <div key={item.id} className="flex items-center justify-between rounded-md border border-vault-border bg-vault-surface p-3"><span className="text-sm text-vault-text">{item.name}</span><span className="data text-vault-green">{currency.format(daily.amount)}</span></div>;
              })}
            </div>
            <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-vault-muted"><Mail size={14} className="mt-0.5 text-vault-gold" />{digest.insight}</p>
          </div>
        </aside>
      </section>
    </AppShell>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-md border border-vault-border bg-vault-surface p-4">
      <span className="text-sm text-vault-text">{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-vault-gold" />
    </label>
  );
}

function NumberPref({ label, value, suffix, onChange }: { label: string; value: number; suffix: string; onChange: (value: number) => void }) {
  return <label><span className="section-label mb-2 block">{label}</span><div className="flex items-center gap-2"><input className="form-input data" value={value} onChange={(event) => onChange(Number(event.target.value || 0))} /><span className="text-vault-muted">{suffix}</span></div></label>;
}

function TimePref({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label><span className="section-label mb-2 block">{label}</span><input className="form-input data" type="time" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}
