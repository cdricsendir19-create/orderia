import { NextResponse } from "next/server";
import { verifyShopifyWebhook } from "@/lib/shopify/webhook";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rawBody = await request.text();

  const hmacHeader = request.headers.get("x-shopify-hmac-sha256");

  try {
    const valid = verifyShopifyWebhook(rawBody, hmacHeader);

    if (!valid) {
      return NextResponse.json(
        { ok: false, error: "Invalid webhook signature" },
        { status: 401 },
      );
    }
  } catch (error) {
    console.error("Shopify webhook configuration error:", error);

    return NextResponse.json(
      { ok: false, error: "Webhook configuration error" },
      { status: 500 },
    );
  }

  let payload: unknown;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const topic = request.headers.get("x-shopify-topic");
  const shopDomain = request.headers.get("x-shopify-shop-domain");
  const webhookId = request.headers.get("x-shopify-webhook-id");

  console.log("Shopify webhook received:", {
    topic,
    shopDomain,
    webhookId,
  });

  if (topic !== "orders/create") {
    return NextResponse.json(
      {
        ok: false,
        error: "Unsupported webhook topic",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    received: true,
    topic,
    shopDomain,
    webhookId,
    payloadReceived: Boolean(payload),
  });
}
