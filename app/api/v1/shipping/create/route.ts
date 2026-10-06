import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getImirRate } from "@/lib/shipping/imir-rates";
import { imirRequest } from "../../../../../lib/shipping/imir-client";
import { getShippingProvider } from "../../../../../lib/shipping/providers";
import { isAuthResponse, requireMerchant } from "@/lib/api-auth";

function extractTrackingNo(value: unknown): string | null {
  const keys = [
    "trackingNo",
    "tracking_no",
    "tracking",
    "tracking_number",
    "trackingNumber",
    "code",
    "code_suivi",
    "numero_suivi",
    "parcel_code",
    "order_code",
    "id_colis",
  ];

  const visit = (node: unknown): string | null => {
    if (!node || typeof node !== "object") return null;

    const record = node as Record<string, unknown>;

    for (const key of keys) {
      const candidate = record[key];

      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }

      if (typeof candidate === "number") {
        return String(candidate);
      }
    }

    for (const child of Object.values(record)) {
      const found = visit(child);
      if (found) return found;
    }

    return null;
  };

  return visit(value);
}

export async function POST(request: NextRequest) {
  const auth = requireMerchant(request);

  if (isAuthResponse(auth)) return auth;

  try {
    const body = await request.json();

    const orderId = String(body.orderId ?? "").trim();
    const providerCode = String(body.provider ?? "imir").trim();

    const method =
      body.method === "stopdesk" ? "stopdesk" : "home";

    const wilayaId = Number(body.wilayaId);

    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: "orderId is required" },
        { status: 400 },
      );
    }

    if (
      !Number.isInteger(wilayaId) ||
      wilayaId < 1 ||
      wilayaId > 58
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "wilayaId must be between 1 and 58",
        },
        { status: 400 },
      );
    }

    const commune = String(body.commune ?? "").trim();

    if (!commune) {
      return NextResponse.json(
        { ok: false, error: "commune is required" },
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
        items: true,
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
          error: "Order already has a shipment",
          shipment: order.shipment,
        },
        { status: 409 },
      );
    }

    const product =
      order.items
        .map(
          (item) =>
            `${item.title} x${item.quantity}`,
        )
        .join(", ")
        .slice(0, 255) ||
      `Commande ${order.id}`;

    let fee: number;
    let trackingNo: string | null = null;
    let providerResponse: unknown = null;

    if (providerCode === "imir") {
      const quote = getImirRate(wilayaId, method);

      if (!quote) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "No IMIR rate available for this wilaya and method",
          },
          { status: 404 },
        );
      }

      fee = quote.fee;

      const path =
        process.env.IMIR_CREATE_PARCEL_PATH ||
        "/api/v1/orders";

      const providerBody = {
        nom_client:
          order.customer?.name ?? "Client Orderia",

        telephone:
          order.customer?.phone ?? "",

        adresse:
          order.customer?.address ?? "",

        code_wilaya: wilayaId,

        commune,

        montant:
          order.total + quote.fee,

        produit: product,

        remarque:
          order.notes ?? "",

        weight:
          Number(body.weight ?? 1),

        reference:
          order.id,

        stop_desk:
          method === "stopdesk" ? 1 : 0,
      };

      providerResponse =
        await imirRequest<unknown>({
          path,
          method: "POST",
          body: providerBody,
        });

      trackingNo =
        extractTrackingNo(providerResponse);
    } else {
      const provider =
        getShippingProvider(providerCode);

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
        weight: Number(body.weight ?? 1),
      });

      if (!quote.available) {
        return NextResponse.json(
          {
            ok: false,
            provider: provider.code,
            error:
              quote.reason ??
              "Shipping method is unavailable",
            quote,
          },
          { status: 404 },
        );
      }

      fee = quote.fee;

      const created =
        await provider.createShipment({
          orderId: order.id,
          customerName:
            order.customer?.name ??
            "Client Orderia",
          phone:
            order.customer?.phone ?? "",
          address:
            order.customer?.address ?? "",
          wilayaId,
          commune,
          method,
          amount: order.total + fee,
          product,
          notes: order.notes ?? "",
          weight: Number(body.weight ?? 1),
        });

      trackingNo = created.trackingNo;
      providerResponse = created.raw;
    }

    let shipment;

    try {
      shipment = await db.shipment.create({
        data: {
          merchantId: auth.merchantId,
          orderId: order.id,
          method,
          wilayaId,
          fee,
          trackingNo,
          status: trackingNo
            ? "shipped"
            : "pending",
        },
      });
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: string }).code ===
          "P2002"
      ) {
        const existing =
          await db.shipment.findUnique({
            where: {
              orderId: order.id,
            },
          });

        return NextResponse.json(
          {
            ok: false,
            error:
              "Order already has a shipment",
            shipment: existing,
          },
          { status: 409 },
        );
      }

      throw error;
    }

    await db.order.update({
      where: {
        id: order.id,
      },
      data: {
        status: trackingNo
          ? "shipped"
          : "processing",
      },
    });

    return NextResponse.json(
      {
        ok: true,
        provider: providerCode,
        shipment,
        quote: {
          wilayaId,
          method,
          fee,
          currency: "DZD",
        },
        trackingNo,
        providerResponse,
      },
      { status: 201 },
    );
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