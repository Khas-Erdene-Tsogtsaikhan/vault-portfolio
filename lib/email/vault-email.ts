import { Resend } from "resend";
import { supabaseAdmin } from "../supabase-server";

export type EmailSendType = "daily_ath" | "daily_up" | "daily_neutral" | "weekly_digest";

export interface ProfileEmailRow {
  id: string;
  email: string;
  username: string | null;
  timezone?: string | null;
  email_unsubscribe_token?: string | null;
  email_unsubscribed_at?: string | null;
  notify_digest_weekly?: boolean | null;
}

export interface EmailPayload {
  userId: string;
  to: string;
  type: EmailSendType;
  subject: string;
  html: string;
  preview: string;
  metadata?: Record<string, unknown>;
}

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.VAULT_APP_URL || "https://vault-portfolio-production.up.railway.app").replace(/\/$/, "");

export function createResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Set RESEND_API_KEY before sending VAULT emails.");
  return new Resend(apiKey);
}

export function fromAddress() {
  return process.env.RESEND_FROM_EMAIL || "VAULT <onboarding@resend.dev>";
}

export async function getEmailProfiles() {
  if (!supabaseAdmin) throw new Error("Set SUPABASE_SERVICE_ROLE_KEY before sending VAULT emails.");
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id,email,username,timezone,email_unsubscribe_token,email_unsubscribed_at,notify_digest_weekly")
    .is("email_unsubscribed_at", null)
    .not("email", "is", null);
  if (error) throw error;
  return (data ?? []).filter((profile) => Boolean(profile.email)) as ProfileEmailRow[];
}

export async function alreadySent(userId: string, type: "daily" | "weekly", now = new Date()) {
  if (!supabaseAdmin) throw new Error("Set SUPABASE_SERVICE_ROLE_KEY before sending VAULT emails.");
  if (type === "daily") {
    const sendDate = isoDateInTimeZone(now, "America/New_York");
    const { data, error } = await supabaseAdmin
      .from("email_sends")
      .select("id")
      .eq("user_id", userId)
      .eq("send_date", sendDate)
      .eq("status", "sent")
      .limit(1);
    if (error) throw error;
    return Boolean(data?.length);
  }

  const weekStart = startOfUtcWeek(now).toISOString();
  const { data, error } = await supabaseAdmin
    .from("email_sends")
    .select("id")
    .eq("user_id", userId)
    .eq("send_type", "weekly_digest")
    .eq("status", "sent")
    .gte("sent_at", weekStart)
    .limit(1);
  if (error) throw error;
  return Boolean(data?.length);
}

export async function recordEmailSend(payload: EmailPayload, resendId: string | null, now = new Date()) {
  if (!supabaseAdmin) throw new Error("Set SUPABASE_SERVICE_ROLE_KEY before recording VAULT emails.");
  const { error } = await supabaseAdmin.from("email_sends").insert({
    user_id: payload.userId,
    send_type: payload.type,
    subject: payload.subject,
    resend_id: resendId,
    status: "sent",
    send_date: isoDateInTimeZone(now, "America/New_York"),
    sent_at: now.toISOString(),
    metadata: payload.metadata ?? {}
  });
  if (error) throw error;
}

export function shouldSendForLocalMorning(profile: ProfileEmailRow, now = new Date()) {
  const timezone = profile.timezone || "America/New_York";
  const hour = hourInTimeZone(now, timezone);
  return hour >= 7 && hour < 9;
}

export function renderVaultEmail({
  eyebrow,
  headline,
  value,
  positiveLine,
  rows,
  cta = "Open your Vault",
  unsubscribeToken
}: {
  eyebrow: string;
  headline: string;
  value: string;
  positiveLine?: string;
  rows?: Array<{ label: string; value: string; positive?: boolean }>;
  cta?: string;
  unsubscribeToken?: string | null;
}) {
  const unsubscribeUrl = unsubscribeToken ? `${siteUrl}/api/email/unsubscribe?token=${unsubscribeToken}` : `${siteUrl}/profile`;
  const rowsHtml = (rows ?? []).map((row) => `
    <tr>
      <td style="padding:10px 0;border-top:1px solid rgba(255,255,255,.07);color:rgba(240,236,232,.55);font-size:13px">${escapeHtml(row.label)}</td>
      <td style="padding:10px 0;border-top:1px solid rgba(255,255,255,.07);color:${row.positive ? "#2e9e5b" : "#f0ece8"};font-size:13px;text-align:right;font-weight:600">${escapeHtml(row.value)}</td>
    </tr>
  `).join("");

  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="content-type" content="text/html; charset=utf-8" />
    <title>VAULT</title>
  </head>
  <body style="margin:0;background:#0a0a0f;color:#f0ece8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
    <div style="display:none;max-height:0;overflow:hidden;color:transparent">VAULT portfolio update</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0a0a0f">
      <tr>
        <td align="center" style="padding:32px 18px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px">
            <tr>
              <td style="padding:0 0 28px;color:#c9a84c;font-size:12px;letter-spacing:.22em;text-transform:uppercase;font-weight:700">VAULT</td>
            </tr>
            <tr>
              <td style="color:rgba(240,236,232,.48);font-size:11px;letter-spacing:.14em;text-transform:uppercase;padding-bottom:8px">${escapeHtml(eyebrow)}</td>
            </tr>
            <tr>
              <td style="font-family:Georgia,'Times New Roman',serif;color:#f0ece8;font-size:34px;line-height:1.08;padding-bottom:8px">${escapeHtml(value)}</td>
            </tr>
            <tr>
              <td style="color:#f0ece8;font-size:16px;line-height:1.45;padding-bottom:${positiveLine ? "8px" : "22px"}">${escapeHtml(headline)}</td>
            </tr>
            ${positiveLine ? `<tr><td style="color:#2e9e5b;font-size:14px;font-weight:700;padding-bottom:22px">${escapeHtml(positiveLine)}</td></tr>` : ""}
            ${rowsHtml ? `<tr><td><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:4px 0 24px">${rowsHtml}</table></td></tr>` : ""}
            <tr>
              <td style="padding-top:2px">
                <a href="${siteUrl}/dashboard" style="display:inline-block;background:#c9a84c;color:#0a0a0f;text-decoration:none;border-radius:6px;padding:13px 18px;font-size:13px;font-weight:800;letter-spacing:.06em;text-transform:uppercase">${escapeHtml(cta)}</a>
              </td>
            </tr>
            <tr>
              <td style="padding-top:34px;color:rgba(240,236,232,.36);font-size:11px;line-height:1.6">
                Guide values from PriceCharting. Actual prices may vary.<br />
                <a href="${unsubscribeUrl}" style="color:rgba(240,236,232,.42)">Unsubscribe</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function money(value: number, digits = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value);
}

export function signedMoney(value: number) {
  return `${value >= 0 ? "+" : "-"}${money(Math.abs(value))}`;
}

export function pct(value: number) {
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
}

export function isoDateInTimeZone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

function hourInTimeZone(date: Date, timezone: string) {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    hour12: false
  }).format(date);
  return Number(hour);
}

function startOfUtcWeek(date: Date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#039;"
    };
    return map[char];
  });
}
