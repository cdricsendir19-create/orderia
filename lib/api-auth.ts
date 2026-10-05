import { NextRequest } from "next/server";

export type AuthContext = { merchantId: string };

export function requireMerchant(request: NextRequest): AuthContext | Response {
  const supplied = request.headers.get("x-orderia-api-key")?.trim();

  if (!supplied) {
    return Response.json(
      { ok: false, error: "API key required" },
      { status: 401 }
    );
  }

  const raw = process.env.ORDERIA_API_KEYS?.trim();

  if (!raw) {
    return Response.json(
      { ok: false, error: "API authentication is not configured" },
      { status: 503 }
    );
  }

  let merchantId: string | undefined;

  try {
    const keys = JSON.parse(raw) as Record<string, string>;
    merchantId = keys[supplied];
  } catch {
    if (supplied === raw) {
      merchantId = "merchant_001";
    }
  }

  if (!merchantId) {
    return Response.json(
      { ok: false, error: "Invalid API key" },
      { status: 401 }
    );
  }

  return { merchantId };
}