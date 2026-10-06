import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { imirRequest } from "../../../../../lib/shipping/imir-client";
import { getShippingProvider } from "../../../../../lib/shipping/providers";
import { isAuthResponse, requireMerchant } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const auth = requireMerchant(request);

  if (isAuthResponse(auth)) return auth;

  const tracking =
    request.nextUrl.searchParams.get("tracking")?.trim();

  const providerCode =
    request.nextUrl.searchParams.get("provider")?.trim() ??
    "imir";

  if (!tracking) {
    return NextResponse.json(
      {
        ok: false,
        error: "tracking is required",
      },
      { status: 400 },
    );
  }

  // Never query a carrier with an arbitrary tracking number.
  // The shipment must belong to this merchant.
  const shipment = await db.shipment.findFirst({
    where: {
      merchantId: auth.merchantId,
      trackingNo: tracking,
    },
    select: {
      id: true,
      orderId: true,
      trackingNo: true,
      status: true,
      method: true,
      wilayaId: true,
      fee: true,
    },
  });

  if (!shipment) {
    return NextResponse.json(
      {
        ok: false,
        error: "Shipment not found",
      },
      { status: 404 },
    );
  }

  try {
    if (providerCode === "imir") {
      const template =
        process.env.IMIR_TRACKING_PATH;

      if (!template) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "IMIR_TRACKING_PATH is required",
          },
          { status: 400 },
        );
      }

      const path = template.replace(
        "{tracking}",
        encodeURIComponent(tracking),
      );

      const data = await imirRequest({
        path,
      });

      return NextResponse.json({
        ok: true,
        provider: "imir",
        tracking,
        shipment,
        data,
      });
    }

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

    const result =
      await provider.track(tracking);

    return NextResponse.json({
      ok: true,
      provider: provider.code,
      tracking,
      shipment,
      data: result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Shipping tracking request failed",
      },
      { status: 502 },
    );
  }
}