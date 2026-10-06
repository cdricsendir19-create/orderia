import { NextResponse } from "next/server";

export async function GET() {
  const databaseConfigured = Boolean(
    process.env.DATABASE_URL_UNPOOLED ||
      process.env.DATABASE_URL ||
      process.env.POSTGRES_PRISMA_URL,
  );

  const imirConfigured = Boolean(
    process.env.IMIR_API_BASE_URL && process.env.IMIR_API_TOKEN,
  );

  const apiAuthConfigured = Boolean(process.env.ORDERIA_API_KEYS);

  return NextResponse.json({
    ok: true,
    service: "orderia",
    version: "5.5.0",
    checks: {
      databaseConfigured,
      imirConfigured,
      apiAuthConfigured,
    },
  });
}