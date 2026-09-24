export async function GET() {
  return Response.json({
    ok: true,
    service: "orderia",
    timestamp: new Date().toISOString(),
  });
}
