import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  createSession,
  dashboardCookieMaxAge,
  dashboardCookieName,
} from "@/lib/dashboard-auth";

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    const body = contentType.includes("application/json")
      ? await request.json()
      : Object.fromEntries((await request.formData()).entries());

    const supplied = String(body.apiKey ?? "").trim();
    const raw = process.env.ORDERIA_API_KEYS;

    if (!raw) {
      return NextResponse.json(
        { ok: false, error: "API authentication is not configured" },
        { status: 503 },
      );
    }

    const keys = JSON.parse(raw) as Record<string, string>;
    const merchantId = keys[supplied];

    if (!merchantId) {
      return NextResponse.json(
        { ok: false, error: "Invalid API key" },
        { status: 401 },
      );
    }

    const existingMerchant = await db.merchant.findUnique({
      where: { id: merchantId },
      select: { id: true },
    });

    if (!existingMerchant) {
      try {
        await db.merchant.create({
          data: {
            id: merchantId,
            name:
              process.env.ORDERIA_MERCHANT_NAME?.trim() ||
              "Orderia Merchant",
            email:
              process.env.ORDERIA_MERCHANT_EMAIL?.trim() ||
              `merchant-${merchantId}@orderia.local`,
          },
        });
      } catch (error) {
        if (
          !(
            error &&
            typeof error === "object" &&
            "code" in error &&
            (error as { code?: string }).code === "P2002"
          )
        ) {
          throw error;
        }
      }
    }

    const wantsJson = contentType.includes("application/json");

    const response = wantsJson
      ? NextResponse.json({ ok: true })
      : NextResponse.redirect(new URL("/dashboard", request.url));

    response.cookies.set({
      name: dashboardCookieName,
      value: createSession(merchantId),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: dashboardCookieMaxAge,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Invalid request body",
      },
      { status: 400 },
    );
  }
}
