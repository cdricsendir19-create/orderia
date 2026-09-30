import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { imirRequest } from "../../../../../lib/shipping/imir-client";
import { isAuthResponse, requireMerchant } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const auth = requireMerchant(request);
  if (isAuthResponse(auth)) return auth;

  const tracking = request.nextUrl.searchParams.get("tracking")?.trim();
  const template = process.env.IMIR_TRACKING_PATH;
  if (!tracking || !template) {
    return NextResponse.json(
      { ok: false, error: "tracking and IMIR_TRACKING_PATH are required" },
      { status: 400 },
    );
  }

  // Never query the carrier with an arbitrary tracking number first.
  // The tracking number must belong to a shipment owned by this merchant.
  const shipment = await db.shipment.findFirst({
    where: { merchantId: auth.merchantId, trackingNo: tracking },
    select: { id: true, orderId: true, trackingNo: true, status: true, method: true, wilayaId: true, fee: true },
  });

  if (!shipment) {
    return NextResponse.json(
      { ok: false, error: "Shipment not found" },
      { status: 404 },
    );
  }

  try {
    const path = template.replace("{tracking}", encodeURIComponent(tracking));
    const data = await imirRequest({ path });
    return NextResponse.json({
      ok: true,
      provider: "imir",
      tracking,
      shipment,
      data,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "IMIR request failed" },
      { status: 502 },
    );
  }
}
