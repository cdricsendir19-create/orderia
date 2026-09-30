import { NextRequest, NextResponse } from "next/server";
import { createSession, dashboardCookieMaxAge, dashboardCookieName } from "@/lib/dashboard-auth";

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json") ? await request.json() : Object.fromEntries((await request.formData()).entries());
    const supplied = String(body.apiKey ?? "").trim();
    const raw = process.env.ORDERIA_API_KEYS;
    if (!raw) return NextResponse.json({ ok: false, error: "API authentication is not configured" }, { status: 503 });
    const keys = JSON.parse(raw) as Record<string, string>;
    const merchantId = keys[supplied];
    if (!merchantId) return NextResponse.json({ ok: false, error: "Invalid API key" }, { status: 401 });

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
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }
}
