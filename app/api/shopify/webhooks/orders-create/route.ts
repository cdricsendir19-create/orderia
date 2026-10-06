import { NextResponse } from "next/server";
import { verifyShopifyWebhook } from "@/lib/shopify/webhook";
import { mapShopifyOrder } from "@/lib/shopify/order-mapper";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rawBody = await request.text();

  const hmacHeader = request.headers.get("x-shopify-hmac-sha256");
  const topic = request.headers.get("x-shopify-topic");
  const shopDomain = request.headers.get("x-shopify-shop-domain");

  try {
    if (!verifyShopifyWebhook(rawBody, hmacHeader)) {
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

  if (topic !== "orders/create") {
    return NextResponse.json(
      { ok: false, error: "Unsupported webhook topic" },
      { status: 400 },
    );
  }

  if (!shopDomain) {
    return NextResponse.json(
      { ok: false, error: "Missing Shopify shop domain" },
      { status: 400 },
    );
  }

  let payload: Parameters<typeof mapShopifyOrder>[0];

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const mapped = mapShopifyOrder(payload);

  if (!mapped.externalId) {
    return NextResponse.json(
      { ok: false, error: "Missing Shopify order ID" },
      { status: 400 },
    );
  }

  try {
    const connection = await db.shopifyConnection.findFirst({
      where: {
        shopDomain,
        status: "active",
      },
    });

    if (!connection) {
      console.error("Shopify connection not found:", shopDomain);

      return NextResponse.json(
        { ok: false, error: "Shopify connection not found" },
        { status: 404 },
      );
    }

    const existing = await db.externalOrder.findUnique({
      where: {
        connectionId_platform_externalId: {
          connectionId: connection.id,
          platform: "shopify",
          externalId: mapped.externalId,
        },
      },
    });

    if (existing) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        orderId: existing.orderId,
      });
    }

    const result = await db.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          merchantId: connection.merchantId,
          name: mapped.customer.name,
          phone: mapped.customer.phone || "N/A",
          address: mapped.customer.address,
          wilayaId: mapped.customer.wilayaId,
        },
      });

      const order = await tx.order.create({
        data: {
          merchantId: connection.merchantId,
          customerId: customer.id,
          status: mapped.order.status,
          total: mapped.order.total,
          currency: mapped.order.currency,
          notes: mapped.order.notes,
          items: {
            create: mapped.items.map((item) => ({
              productId: item.productId,
              title: item.title,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          },
        },
      });

      await tx.externalOrder.create({
        data: {
          merchantId: connection.merchantId,
          connectionId: connection.id,
          orderId: order.id,
          platform: "shopify",
          externalId: mapped.externalId,
          externalNumber: mapped.externalNumber || null,
        },
      });

      return {
        customerId: customer.id,
        orderId: order.id,
      };
    });

    return NextResponse.json({
      ok: true,
      imported: true,
      ...result,
    });
  } catch (error) {
    console.error("Shopify order import failed:", error);

    return NextResponse.json(
      { ok: false, error: "Failed to import Shopify order" },
      { status: 500 },
    );
  }
}