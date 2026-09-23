export async function GET() {
  return Response.json({
    ok: true,
    version: "5.0.0",
    environment: process.env.NODE_ENV,
    database: Boolean(process.env.DATABASE_URL),
    shopify: Boolean(process.env.SHOPIFY_CLIENT_ID),
    shippingProvider: Boolean(process.env.IMIR_API_BASE_URL),
    note: "Provider credentials and database are intentionally not exposed.",
  });
}
