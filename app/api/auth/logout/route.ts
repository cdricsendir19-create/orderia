import { NextRequest, NextResponse } from "next/server";
import { dashboardCookieName } from "@/lib/dashboard-auth";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(
    new URL("/dashboard", request.url)
  );

  response.cookies.set({
    name: dashboardCookieName,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}