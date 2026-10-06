import { createHmac, timingSafeEqual } from "node:crypto";

function getWebhookSecret() {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error("SHOPIFY_WEBHOOK_SECRET is not configured");
  }

  return secret;
}

export function verifyShopifyWebhook(
  rawBody: string,
  hmacHeader: string | null,
) {
  if (!hmacHeader) {
    return false;
  }

  const digest = createHmac("sha256", getWebhookSecret())
    .update(rawBody, "utf8")
    .digest("base64");

  const expected = Buffer.from(digest, "utf8");
  const received = Buffer.from(hmacHeader, "utf8");

  if (expected.length !== received.length) {
    return false;
  }

  return timingSafeEqual(expected, received);
}
