import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getImirRate } from "@/lib/shipping/imir-rates";
import { isAuthResponse, requireMerchant } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  const auth = requireMerchant(request);
  if (isAuthResponse(auth)) return auth;

  try {
    const body = await request.json();

    const orderId = String(body.orderId ?? "").trim();
    const method =
      body.method === "stopdesk" ? "stopdesk" : "home";
    const wilayaId = Number(body.wilayaId);

    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: "orderId is required" },
        { status: 400 },
      );
    }

    if (!Number.isInteger(wilayaId) || wilayaId < 1) {
      return NextResponse.json(
        { ok: false, error: "wilayaId must be a positive integer" },
        { status: 400 },
      );
    }

    const order = await db.order.findFirst({
      where: {
        id: orderId,
        merchantId: auth.merchantId,
      },
      include: {
        customer: true,
        shipment: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { ok: false, error: "Order not found" },
        { status: 404 },
      );
    }

    if (order.shipment) {
      return NextResponse.json(
        {
          ok: false,
          error: "Shipment already exists",
          shipment: order.shipment,
        },
        { status: 409 },
      );
    }

    const quote = getImirRate(wilayaId, method);

    if (!quote) {
      return NextResponse.json(
        {
          ok: false,
          error: "No IMIR rate available for this wilaya and method",
        },
        { status: 404 },
      );
    }

    const shipment = await db.shipment.create({
      data: {
        merchantId: auth.merchantId,
        orderId: order.id,
        method,
        wilayaId,
        fee: quote.fee,
        status: "pending",
      },
    });

    await db.order.update({
      where: { id: order.id },
      data: {
        status: "processing",
      },
    });

    return NextResponse.json({
      ok: true,
      provider: "imir",
      shipment,
      quote,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to create shipment",
      },
      { status: 400 },
    );
  }
}
