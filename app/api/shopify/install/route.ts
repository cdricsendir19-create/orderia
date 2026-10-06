import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const shop = url.searchParams.get("shop");

    if (!shop) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing shop parameter",
        },
        { status: 400 },
      );
    }

    const normalizedShop = shop
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "");

    if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(normalizedShop)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid Shopify shop domain",
        },
        { status: 400 },
      );
    }

    const clientId = getEnv("SHOPIFY_CLIENT_ID");
    const appUrl = getEnv("SHOPIFY_APP_URL");

    const redirectUri = `${appUrl.replace(/\/+$/, "")}/api/shopify/callback`;

    const scopes = [
      "read_orders",
      "read_customers",
      "read_products",
    ].join(",");

    const state = crypto.randomUUID();

    const response = NextResponse.redirect(
      `https://${normalizedShop}/admin/oauth/authorize?client_id=${encodeURIComponent(
        clientId,
      )}&scope=${encodeURIComponent(
        scopes,
      )}&redirect_uri=${encodeURIComponent(
        redirectUri,
      )}&state=${encodeURIComponent(state)}`,
    );

    response.cookies.set("shopify_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10,
    });

    response.cookies.set("shopify_oauth_shop", normalizedShop, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10,
    });

    return response;
  } catch (error) {
    console.error("Shopify install error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Shopify installation is not configured",
      },
      { status: 500 },
    );
  }
}
