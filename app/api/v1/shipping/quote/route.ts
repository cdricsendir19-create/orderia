import { NextRequest, NextResponse } from "next/server";
import { getImirRate } from "../../../../../lib/shipping/imir-rates";
import { isAuthResponse, requireMerchant } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const auth = requireMerchant(request);
  if (isAuthResponse(auth)) return auth;
  const url = new URL(request.url);
  const rawWilayaId = url.searchParams.get("wilaya_id");
  const wilayaId = Number(rawWilayaId);
  if (!rawWilayaId || !Number.isInteger(wilayaId) || wilayaId < 1) {
    return NextResponse.json({ ok: false, error: "wilaya_id must be a positive integer" }, { status: 400 });
  }
  const rawMethod = url.searchParams.get("method") ?? "home";
  if (rawMethod !== "home" && rawMethod !== "stopdesk") {
    return NextResponse.json({ ok: false, error: "method must be home or stopdesk" }, { status: 400 });
  }
  const method = rawMethod;
  const quote = getImirRate(wilayaId, method);
  if (!quote) return NextResponse.json({ ok: false, error: "No rate available" }, { status: 404 });
  return NextResponse.json({ ok: true, provider: "imir", quote });
}
