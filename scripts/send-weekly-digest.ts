import {
  alreadySent,
  createResendClient,
  fromAddress,
  getEmailProfiles,
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
    : profiles.filter((profile) => profile.notify_digest_weekly !== false);

  if (!filtered.length) {
    console.log(args.user ? `No profile found for ${args.user}.` : "No weekly email-eligible profiles found.");
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
    if (await alreadySent(profile.id, "weekly", now)) {
      console.log(`Skipping ${profile.email}: weekly digest already sent.`);
      skipped += 1;
      continue;
    }

    const payload = await buildWeeklyEmail(profile, now);
    if (!payload) {
      console.log(`Skipping ${profile.email}: no portfolio data yet.`);
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

  console.log(`Weekly email job complete. Sent/logged ${sent}; skipped ${skipped}.`);
}

async function buildWeeklyEmail(profile: ProfileEmailRow, now: Date): Promise<EmailPayload | null> {
  const latest = await getLatestPortfolioSnapshot(profile.id);
  if (!latest) return null;

  const weekStart = new Date(now);
  weekStart.setUTCDate(weekStart.getUTCDate() - 7);
  const { data: snapshots, error: snapshotError } = await supabaseAdmin!
    .from("portfolio_snapshots")
    .select("total_value,snapshot_date")
    .eq("user_id", profile.id)
    .gte("snapshot_date", weekStart.toISOString().slice(0, 10))
    .order("snapshot_date", { ascending: true });
  if (snapshotError) throw snapshotError;

  const weekStartValue = Number(snapshots?.[0]?.total_value ?? latest.total_value ?? 0);
  const weekEndValue = Number(latest.total_value ?? 0);
  const weekDelta = weekEndValue - weekStartValue;
  const weekDeltaPct = weekStartValue > 0 ? weekDelta / weekStartValue : 0;

  const topItems = await getTopItems(profile.id);
  const best = await getBestWeeklyPerformer(profile.id, weekStart.toISOString().slice(0, 10));
  const movementLine = weekDelta >= 0
    ? `${signedMoney(weekDelta)} (${pct(weekDeltaPct)}) this week`
    : "Guide values refreshed for the week";

  return {
    userId: profile.id,
    to: profile.email,
    type: "weekly_digest",
    subject: `Your Vault this week · ${money(weekEndValue)} total`,
    preview: `${money(weekEndValue)} total. ${best ? `${best.itemName} was your best performer.` : "Your guide values are up to date."}`,
    html: renderVaultEmail({
      eyebrow: "Weekly portfolio digest",
      value: money(weekEndValue),
      headline: "Your weekly VAULT snapshot is ready.",
      positiveLine: weekDelta >= 0 ? movementLine : undefined,
      rows: [
        { label: "Portfolio value", value: money(weekEndValue) },
        { label: "This week", value: movementLine, positive: weekDelta > 0 },
        ...(best ? [{ label: "Best performer", value: `${best.itemName} · ${signedMoney(best.delta)}`, positive: best.delta > 0 }] : []),
        ...topItems.map((item, index) => ({ label: `Top item ${index + 1}`, value: `${item.name} · ${money(item.value)}` }))
      ],
      cta: "Open your Vault",
      unsubscribeToken: profile.email_unsubscribe_token
    }),
    metadata: { week_delta: weekDelta, best_item_id: best?.itemId }
  };
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

async function getTopItems(userId: string) {
  const { data, error } = await supabaseAdmin!
    .from("items")
    .select("id,name,current_value_market,current_value_user,cost_basis")
    .eq("user_id", userId)
    .eq("is_sold", false);
  if (error) throw error;
  return (data ?? [])
    .map((item) => ({
      id: item.id,
      name: item.name,
      value: Number(item.current_value_market ?? item.current_value_user ?? item.cost_basis ?? 0)
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);
}

async function getBestWeeklyPerformer(userId: string, weekStart: string) {
  const { data, error } = await supabaseAdmin!
    .from("item_price_snapshots")
    .select("item_id,value,snapshot_date")
    .eq("user_id", userId)
    .gte("snapshot_date", weekStart)
    .order("snapshot_date", { ascending: true });
  if (error) throw error;
  if (!data?.length) return null;

  const byItem = new Map<string, { first: number; last: number }>();
  for (const row of data) {
    const current = byItem.get(row.item_id);
    if (!current) byItem.set(row.item_id, { first: Number(row.value ?? 0), last: Number(row.value ?? 0) });
    else current.last = Number(row.value ?? 0);
  }

  const winner = Array.from(byItem.entries())
    .map(([itemId, values]) => ({ itemId, delta: values.last - values.first }))
    .sort((a, b) => b.delta - a.delta)[0];
  if (!winner || winner.delta <= 0) return null;

  const { data: item } = await supabaseAdmin!
    .from("items")
    .select("name")
    .eq("id", winner.itemId)
    .maybeSingle();
  if (!item) return null;
  return { ...winner, itemName: item.name };
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
