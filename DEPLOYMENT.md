# Orderia Production Readiness

## Required services
- PostgreSQL database with `DATABASE_URL`.
- Vercel project running the Next.js app.
- Secrets configured in Vercel environment variables.

## Before production
1. Run `npx prisma generate`.
2. Apply the Prisma schema/migrations against production PostgreSQL.
3. Set `SESSION_SECRET`, `ENCRYPTION_KEY`, and `CRON_SECRET`.
4. Configure Shopify OAuth values if Shopify integration is enabled.
5. Configure carrier API credentials only after verifying the provider's official API contract.
6. Check `GET /api/system/status` and `GET /api/health`.
7. Verify cron authorization and webhook HMAC/signatures.

## Important
The generic EcoTrack connector is configurable but is not proof of a live IMIR/EcoTrack connection. Provider-specific paths and payloads must match the official API documentation before enabling production shipment creation.
