import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthResponse, requireMerchant } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const auth = requireMerchant(request);
  if (isAuthResponse(auth)) return auth;
  const orders = await db.order.findMany({
    where: { merchantId: auth.merchantId },
    orderBy: { createdAt: "desc" },
    include: { customer: true, items: true, shipment: true },
  });
  return NextResponse.json({ ok: true, orders });
}

export async function POST(request: NextRequest) {
  const auth = requireMerchant(request);
  if (isAuthResponse(auth)) return auth;
  try {
    const body = await request.json();
    if (body.merchantId !== undefined && body.merchantId !== auth.merchantId) {
      return NextResponse.json({ ok: false, error: "merchantId must match the authenticated merchant" }, { status: 400 });
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ ok: false, error: "at least one item is required" }, { status: 400 });
    }
    if (body.customerId) {
      const customer = await db.customer.findFirst({ where: { id: String(body.customerId), merchantId: auth.merchantId }, select: { id: true } });
      if (!customer) return NextResponse.json({ ok: false, error: "Customer not found" }, { status: 404 });
    }
    for (const item of body.items) {
      if (!item || typeof item.title !== "string" || !item.title.trim()) {
        return NextResponse.json({ ok: false, error: "each item needs a title" }, { status: 400 });
      }
      const quantity = Number(item.quantity ?? 1);
      const unitPrice = Number(item.unitPrice ?? 0);
      if (!Number.isSafeInteger(quantity) || quantity < 1 || !Number.isSafeInteger(unitPrice) || unitPrice < 0) {
        return NextResponse.json({ ok: false, error: "invalid item quantity or unitPrice" }, { status: 400 });
      }
    }
    const total = body.items.reduce((sum: number, item: { quantity?: number; unitPrice?: number }) => sum + Number(item.quantity ?? 1) * Number(item.unitPrice ?? 0), 0);
    if (!Number.isSafeInteger(total)) {
      return NextResponse.json({ ok: false, error: "order total is out of range" }, { status: 400 });
    }
    const order = await db.order.create({
      data: {
        merchantId: auth.merchantId,
        customerId: body.customerId ?? null,
        total,
        currency: body.currency ?? "DZD",
        notes: body.notes ?? null,
        items: { create: body.items.map((item: { productId?: string; title: string; quantity?: number; unitPrice?: number }) => ({ productId: item.productId ?? null, title: item.title, quantity: item.quantity ?? 1, unitPrice: item.unitPrice ?? 0 })) },
      },
      include: { customer: true, items: true },
    });
    return NextResponse.json({ ok: true, order }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }
}
