import { NextRequest, NextResponse } from "next/server";
import { getImirRate } from "../../../../../lib/shipping/imir-rates";
import { getShippingProvider } from "../../../../../lib/shipping/providers";
import { isAuthResponse, requireMerchant } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const auth = requireMerchant(request);
  if (isAuthResponse(auth)) return auth;

  const url = new URL(request.url);

  const rawWilayaId = url.searchParams.get("wilaya_id");
  const wilayaId = Number(rawWilayaId);

  if (!rawWilayaId || !Number.isInteger(wilayaId) || wilayaId < 1) {
    return NextResponse.json(
      { ok: false, error: "wilaya_id must be a positive integer" },
      { status: 400 },
    );
  }

  const rawMethod = url.searchParams.get("method") ?? "home";

  if (rawMethod !== "home" && rawMethod !== "stopdesk") {
    return NextResponse.json(
      { ok: false, error: "method must be home or stopdesk" },
      { status: 400 },
    );
  }

  const method = rawMethod as "home" | "stopdesk";
  const providerCode = url.searchParams.get("provider") ?? "imir";

  // IMIR remains the default provider.
  if (providerCode === "imir") {
    const quote = getImirRate(wilayaId, method);

    if (!quote) {
      return NextResponse.json(
        { ok: false, error: "No rate available" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      provider: "imir",
      quote,
    });
  }

  const provider = getShippingProvider(providerCode);

  if (!provider) {
    return NextResponse.json(
      {
        ok: false,
        error: `Shipping provider "${providerCode}" is not configured`,
      },
      { status: 404 },
    );
  }

  const quote = await provider.quote({
    wilayaId,
    method,
  });

  if (!quote.available) {
    return NextResponse.json(
      {
        ok: false,
        provider: provider.code,
        quote,
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    provider: provider.code,
    quote,
  });
}