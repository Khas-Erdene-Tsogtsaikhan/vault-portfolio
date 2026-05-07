import {
  alreadySent,
  createResendClient,
  fromAddress,
  getEmailProfiles,
  isoDateInTimeZone,
  money,
  pct,
  recordEmailSend,
  renderVaultEmail,
  shouldSendForLocalMorning,
  signedMoney,
  type EmailPayload,
  type ProfileEmailRow
} from "../lib/email/vault-email";
import { supabaseAdmin } from "../lib/supabase-server";

const args = parseArgs(process.argv.slice(2));

async function main() {
  if (!supabaseAdmin) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  const dryRun = Boolean(args["dry-run"]);
  const force = Boolean(args.force) || Boolean(args.user);
  const now = new Date();
  const profiles = await getEmailProfiles();
  const filtered = args.user
    ? profiles.filter((profile) => profile.email.toLowerCase() === String(args.user).toLowerCase())
    : profiles;

  if (!filtered.length) {
    console.log(args.user ? `No profile found for ${args.user}.` : "No email-eligible profiles found.");
    return;
  }

  const resend = dryRun ? null : createResendClient();
  let sent = 0;
  let skipped = 0;

  for (const profile of filtered) {
    if (!force && !shouldSendForLocalMorning(profile, now)) {
      skipped += 1;
      continue;
    }
    if (await alreadySent(profile.id, "daily", now)) {
      console.log(`Skipping ${profile.email}: already sent today.`);
      skipped += 1;
      continue;
    }

    const payload = await buildDailyEmail(profile, now);
    if (!payload) {
      console.log(`Skipping ${profile.email}: no positive or neutral daily update.`);
      skipped += 1;
      continue;
    }

    if (dryRun) {
      console.log(`[dry-run] ${profile.email}: ${payload.subject}`);
      console.log(payload.preview);
      sent += 1;
      continue;
    }

    const { data, error } = await resend!.emails.send({
      from: fromAddress(),
      to: profile.email,
      subject: payload.subject,
      html: payload.html
    });
    if (error) {
      console.error(`Failed to send ${profile.email}:`, error);
      skipped += 1;
      continue;
    }

    await recordEmailSend(payload, data?.id ?? null, now);
    console.log(`Sent ${profile.email}: ${payload.subject}`);
    sent += 1;
  }

  console.log(`Daily email job complete. Sent/logged ${sent}; skipped ${skipped}.`);
}

async function buildDailyEmail(profile: ProfileEmailRow, now: Date): Promise<EmailPayload | null> {
  const localDate = isoDateInTimeZone(now, profile.timezone || "America/New_York");
  const latestSnapshot = await getLatestPortfolioSnapshot(profile.id);
  if (!latestSnapshot) return null;

  const ath = await getTodaysAth(profile.id, localDate);
  if (ath) {
    const gainPct = ath.oldHigh > 0 ? (ath.newHigh - ath.oldHigh) / ath.oldHigh : 0;
    return {
      userId: profile.id,
      to: profile.email,
      type: "daily_ath",
      subject: `${ath.itemName} hit a new all-time high 🏆`,
      preview: `${ath.itemName}: ${money(ath.oldHigh)} to ${money(ath.newHigh)} (${pct(gainPct)}).`,
      html: renderVaultEmail({
        eyebrow: "All-time high",
        value: money(ath.newHigh),
        headline: `${ath.itemName} hit a new VAULT high.`,
        positiveLine: `${signedMoney(ath.newHigh - ath.oldHigh)} (${pct(gainPct)})`,
        rows: [
          { label: "Old high", value: money(ath.oldHigh) },
          { label: "New high", value: money(ath.newHigh), positive: true },
          { label: "Portfolio total", value: money(Number(latestSnapshot.total_value ?? 0)) }
        ],
        cta: "See your collection",
        unsubscribeToken: profile.email_unsubscribe_token
      }),
      metadata: { item_id: ath.itemId, old_high: ath.oldHigh, new_high: ath.newHigh }
    };
  }

  const dailyDelta = Number(latestSnapshot.daily_delta ?? 0);
  if (dailyDelta > 0) {
    const best = await getBestDailyPerformer(profile.id, localDate);
    return {
      userId: profile.id,
      to: profile.email,
      type: "daily_up",
      subject: `Your collection is up ${money(dailyDelta)} today ↑`,
      preview: `${money(Number(latestSnapshot.total_value ?? 0))} total. ${best ? `${best.itemName} led the move.` : "Prices refreshed this morning."}`,
      html: renderVaultEmail({
        eyebrow: "Today in your Vault",
        value: money(Number(latestSnapshot.total_value ?? 0)),
        headline: "Your collection moved higher after this morning's guide refresh.",
        positiveLine: `${signedMoney(dailyDelta)} (${pct(Number(latestSnapshot.daily_delta_pct ?? 0))}) today`,
        rows: [
          { label: "Today's gain", value: signedMoney(dailyDelta), positive: true },
          ...(best ? [{ label: "Best performer", value: `${best.itemName} · ${signedMoney(best.delta)}`, positive: true }] : []),
          { label: "Tracked items", value: `${Number(latestSnapshot.item_count ?? 0).toLocaleString()} assets` }
        ],
        cta: "Open your Vault",
        unsubscribeToken: profile.email_unsubscribe_token
      }),
      metadata: { daily_delta: dailyDelta, best_item_id: best?.itemId }
    };
  }

  if (dailyDelta === 0) {
    return {
      userId: profile.id,
      to: profile.email,
      type: "daily_neutral",
      subject: "Your Vault · Updated this morning",
      preview: `${money(Number(latestSnapshot.total_value ?? 0))} total. Prices refreshed — check back tomorrow for market movements.`,
      html: renderVaultEmail({
        eyebrow: "Prices refreshed",
        value: money(Number(latestSnapshot.total_value ?? 0)),
        headline: "Prices refreshed — check back tomorrow for market movements.",
        rows: [
          { label: "Portfolio total", value: money(Number(latestSnapshot.total_value ?? 0)) },
          { label: "Tracked items", value: `${Number(latestSnapshot.item_count ?? 0).toLocaleString()} assets` },
          { label: "Source", value: "PriceCharting Guide Values" }
        ],
        cta: "Open your Vault",
        unsubscribeToken: profile.email_unsubscribe_token
      }),
      metadata: { daily_delta: 0 }
    };
  }

  return null;
}

async function getLatestPortfolioSnapshot(userId: string) {
  const { data, error } = await supabaseAdmin!
    .from("portfolio_snapshots")
    .select("total_value,total_cost_basis,total_gain,total_gain_pct,daily_delta,daily_delta_pct,item_count,snapshot_date,created_at")
    .eq("user_id", userId)
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getTodaysAth(userId: string, localDate: string) {
  const start = `${localDate}T00:00:00.000Z`;
  const { data: events, error } = await supabaseAdmin!
    .from("notification_events")
    .select("item_id,created_at")
    .eq("user_id", userId)
    .eq("type", "ATH")
    .gte("created_at", start)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  const event = events?.[0];
  if (!event?.item_id) return null;

  const { data: item } = await supabaseAdmin!
    .from("items")
    .select("id,name,current_value_market,current_value_user,value_24h_ago")
    .eq("id", event.item_id)
    .maybeSingle();
  if (!item) return null;

  const newHigh = Number(item.current_value_market ?? item.current_value_user ?? 0);
  const oldHigh = Number(item.value_24h_ago ?? 0) || newHigh;
  return { itemId: item.id, itemName: item.name, oldHigh, newHigh };
}

async function getBestDailyPerformer(userId: string, snapshotDate: string) {
  const { data, error } = await supabaseAdmin!
    .from("item_price_snapshots")
    .select("item_id,delta")
    .eq("user_id", userId)
    .eq("snapshot_date", snapshotDate)
    .gt("delta", 0)
    .order("delta", { ascending: false })
    .limit(1);
  if (error) throw error;
  const row = data?.[0];
  if (!row?.item_id) return null;

  const { data: item } = await supabaseAdmin!
    .from("items")
    .select("name")
    .eq("id", row.item_id)
    .maybeSingle();
  if (!item) return null;
  return { itemId: row.item_id, itemName: item.name, delta: Number(row.delta ?? 0) };
}

function parseArgs(values: string[]) {
  const parsed: Record<string, string | boolean> = {};
  for (const value of values) {
    if (!value.startsWith("--")) continue;
    const [key, raw] = value.slice(2).split("=");
    parsed[key] = raw ?? true;
  }
  return parsed;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
