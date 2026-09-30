import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthResponse, requireMerchant } from "@/lib/api-auth";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = requireMerchant(request);
  if (isAuthResponse(auth)) return auth;
  const { id } = await context.params;
  const order = await db.order.findFirst({ where: { id, merchantId: auth.merchantId }, include: { customer: true, items: true, shipment: true } });
  if (!order) return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
  return NextResponse.json({ ok: true, order });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = requireMerchant(request);
  if (isAuthResponse(auth)) return auth;
  const { id } = await context.params;
  try {
    const body = await request.json();
    const allowed = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"];
    if (body.status && !allowed.includes(body.status)) return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 });
    const existing = await db.order.findFirst({ where: { id, merchantId: auth.merchantId }, select: { id: true } });
    if (!existing) return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
    const order = await db.order.update({ where: { id }, data: { ...(body.status ? { status: body.status } : {}), ...(body.notes !== undefined ? { notes: body.notes } : {}) } });
    return NextResponse.json({ ok: true, order });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }
}
