import { createHash } from "node:crypto";
import { NextRequest } from "next/server";

export type AuthContext = { merchantId: string };

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * API authentication for the v5 foundation.
 *
 * ORDERIA_API_KEYS must be a JSON object whose keys are plaintext API keys and
 * whose values are merchant IDs, for example:
 * {"ord_live_xxx":"merchant_cuid"}
 *
 * The key is accepted only over the server-side request boundary. In a later
 * auth service this can be replaced without changing the route contracts.
 */
export function requireMerchant(request: NextRequest): AuthContext | Response {
  const supplied = request.headers.get("x-orderia-api-key")?.trim();
  if (!supplied) {
    return Response.json({ ok: false, error: "API key required" }, { status: 401 });
  }

  const raw = process.env.ORDERIA_API_KEYS;
  if (!raw) {
    return Response.json({ ok: false, error: "API authentication is not configured" }, { status: 503 });
  }

  let keys: Record<string, string>;
  try {
    keys = JSON.parse(raw) as Record<string, string>;
  } catch {
    return Response.json({ ok: false, error: "ORDERIA_API_KEYS is invalid" }, { status: 500 });
  }

  const merchantId = keys[supplied];
  if (!merchantId) {
    // Keep a digest out of logs/responses if operators need to correlate a key.
    void sha256(supplied);
    return Response.json({ ok: false, error: "Invalid API key" }, { status: 401 });
  }

  return { merchantId };
}

export function isAuthResponse(value: AuthContext | Response): value is Response {
  return value instanceof Response;
}
