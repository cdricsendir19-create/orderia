import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDashboardMerchantId } from "@/lib/dashboard-auth";

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
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    const cookies = request.headers.get("cookie") || "";

    const stateCookie = cookies
      .split(";")
      .map((item) => item.trim())
      .find((item) => item.startsWith("shopify_oauth_state="))
      ?.split("=")
      .slice(1)
      .join("=");

    const shopCookie = cookies
      .split(";")
      .map((item) => item.trim())
      .find((item) => item.startsWith("shopify_oauth_shop="))
      ?.split("=")
      .slice(1)
      .join("=");

    if (!shop || !code || !state) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing Shopify callback parameters",
        },
        { status: 400 },
      );
    }

    if (!stateCookie || stateCookie !== state) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid Shopify OAuth state",
        },
        { status: 401 },
      );
    }

    const normalizedShop = shop
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "");

    if (
      !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(
        normalizedShop,
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid Shopify shop domain",
        },
        { status: 400 },
      );
    }

    if (shopCookie && shopCookie !== normalizedShop) {
      return NextResponse.json(
        {
          ok: false,
          error: "Shopify shop mismatch",
        },
        { status: 401 },
      );
    }

    const merchantId = await getDashboardMerchantId();

    if (!merchantId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Orderia session not found",
        },
        { status: 401 },
      );
    }

    const clientId = getEnv("SHOPIFY_CLIENT_ID");
    const clientSecret = getEnv("SHOPIFY_CLIENT_SECRET");

    const tokenResponse = await fetch(
      `https://${normalizedShop}/admin/oauth/access_token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          expiring: 1,
        }),
        cache: "no-store",
      },
    );

    const tokenData = (await tokenResponse.json()) as {
      access_token?: string;
      scope?: string;
      expires_in?: number;
      refresh_token?: string;
      refresh_token_expires_in?: number;
      error?: string;
      error_description?: string;
    };

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error(
        "Shopify token exchange failed:",
        tokenData,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            tokenData.error_description ||
            tokenData.error ||
            "Shopify token exchange failed",
        },
        { status: 400 },
      );
    }

    await db.shopifyConnection.upsert({
      where: {
        merchantId_shopDomain: {
          merchantId,
          shopDomain: normalizedShop,
        },
      },
      create: {
        merchantId,
        shopDomain: normalizedShop,
        accessToken: tokenData.access_token,
        scopes: tokenData.scope || null,
        status: "active",
      },
      update: {
        accessToken: tokenData.access_token,
        scopes: tokenData.scope || null,
        status: "active",
      },
    });

    const response = NextResponse.redirect(
      new URL("/dashboard/shopify", request.url),
    );

    response.cookies.set("shopify_oauth_state", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    response.cookies.set("shopify_oauth_shop", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("Shopify callback error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Shopify callback failed",
      },
      { status: 500 },
    );
  }
}
