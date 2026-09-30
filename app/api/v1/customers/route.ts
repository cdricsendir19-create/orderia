import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthResponse, requireMerchant } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const auth = requireMerchant(request);
  if (isAuthResponse(auth)) return auth;
  const customers = await db.customer.findMany({ where: { merchantId: auth.merchantId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ ok: true, customers });
}

export async function POST(request: NextRequest) {
  const auth = requireMerchant(request);
  if (isAuthResponse(auth)) return auth;
  try {
    const body = await request.json();
    if (body.name == null || body.phone == null) {
      return NextResponse.json({ ok: false, error: "name and phone are required" }, { status: 400 });
    }
    if (body.merchantId !== undefined && body.merchantId !== auth.merchantId) {
      return NextResponse.json({ ok: false, error: "merchantId must match the authenticated merchant" }, { status: 400 });
    }
    const customer = await db.customer.create({
      data: { merchantId: auth.merchantId, name: String(body.name), phone: String(body.phone), wilayaId: body.wilayaId ?? null, address: body.address ?? null },
    });
    return NextResponse.json({ ok: true, customer }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }
}
