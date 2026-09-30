export async function POST(request: NextRequest) {
  const auth = requireMerchant(request);
  if (isAuthResponse(auth)) return auth;

  const path = process.env.IMIR_CREATE_PARCEL_PATH;
  if (!path) return NextResponse.json({ ok: false, error: "IMIR_CREATE_PARCEL_PATH is not configured" }, { status: 503 });

  let requestedOrderId = "";
  try {
    const body = await request.json();
    if (!body.orderId || typeof body.orderId !== "string") {
      return NextResponse.json({ ok: false, error: "orderId is required" }, { status: 400 });
    }
    requestedOrderId = body.orderId;
    if (body.merchantId !== undefined && body.merchantId !== auth.merchantId) {
      return NextResponse.json({ ok: false, error: "merchantId must match the authenticated merchant" }, { status: 400 });
    }

    const order = await db.order.findFirst({
      where: { id: body.orderId, merchantId: auth.merchantId },
      include: { customer: true, items: true, shipment: true },
    });
    if (!order) return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
    if (order.shipment) return NextResponse.json({ ok: false, error: "Order already has a shipment", shipment: order.shipment }, { status: 409 });

    const method = body.method === "stopdesk" ? "stopdesk" : "home";
    const wilayaId = Number(body.wilayaId ?? order.customer?.wilayaId);
    if (!Number.isInteger(wilayaId) || wilayaId < 1) {
      return NextResponse.json({ ok: false, error: "wilayaId is required" }, { status: 400 });
    }

    const provider = await db.shippingProvider.upsert({
      where: { merchantId_code: { merchantId: auth.merchantId, code: "imir" } },
      create: { merchantId: auth.merchantId, name: "IMIR / EcoTrack", code: "imir", enabled: true },
      update: { enabled: true },
      select: { id: true },
    });

    // Reserve the unique orderId before calling the carrier. This closes the
    // race where two requests could both create remote parcels concurrently.
    let shipment;
    try {
      shipment = await db.shipment.create({
        data: {
          merchantId: auth.merchantId,
          orderId: order.id,
          providerId: provider.id,
          method,
          wilayaId,
          fee: 0,
          status: "creating",
        },
      });
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "P2002") {
        const existing = await db.shipment.findUnique({ where: { orderId: order.id } });
        return NextResponse.json({ ok: false, error: "Order already has a shipment", shipment: existing }, { status: 409 });
      }
      throw error;
    }

    try {
      const providerBody = {
        ...body,
        merchantId: auth.merchantId,
        orderId: order.id,
        idempotencyKey: `orderia:${auth.merchantId}:${order.id}`,
        method,
        wilayaId,
        customer: order.customer,
        items: order.items,
        total: order.total,
        currency: order.currency,
      };

      const data = await imirRequest<Record<string, unknown>>({ path, method: "POST", body: providerBody });
      const trackingNo = typeof data.trackingNo === "string" ? data.trackingNo : typeof data.tracking === "string" ? data.tracking : null;
      const fee = Number(data.fee ?? data.shippingFee ?? body.fee ?? 0);

      shipment = await db.shipment.update({
        where: { id: shipment.id },
        data: {
          trackingNo,
          fee: Number.isSafeInteger(fee) && fee >= 0 ? fee : 0,
          status: "created",
        },
      });

      await db.order.update({ where: { id: order.id }, data: { status: "shipped" } });
      return NextResponse.json({ ok: true, provider: "imir", data, shipment }, { status: 201 });
    } catch (error) {
      await db.shipment.deleteMany({ where: { id: shipment.id, status: "creating" } });
      throw error;
    }
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "IMIR request failed" },
      { status: 502 },
    );
  }
}
