import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) {
    return new NextResponse("Missing unsubscribe token.", { status: 400 });
  }

  if (!supabaseAdmin) {
    return new NextResponse("Email preferences are temporarily unavailable.", { status: 503 });
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ email_unsubscribed_at: new Date().toISOString() })
    .eq("email_unsubscribe_token", token);

  if (error) {
    return new NextResponse("Could not update email preferences.", { status: 500 });
  }

  return new NextResponse(
    `<html><body style="background:#0a0a0f;color:#f0ece8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:48px"><div style="max-width:560px;margin:auto"><p style="color:#c9a84c;letter-spacing:.18em;text-transform:uppercase;font-size:12px">VAULT</p><h1 style="font-size:28px">You are unsubscribed.</h1><p style="color:rgba(240,236,232,.72)">You will no longer receive VAULT portfolio emails. Your account and in-app notifications are unchanged.</p></div></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } }
  );
}
