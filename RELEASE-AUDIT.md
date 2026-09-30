# Orderia 5.5.0 — Release Audit

## Completed in this release candidate
- Added the missing Next.js/TypeScript foundation files (`tsconfig.json`, `next-env.d.ts`, `app/layout.tsx`).
- Added Arabic RTL root layout metadata.
- Added API-key authentication for `/api/v1` data and shipping routes.
- Added input validation for order items, shipping quote parameters, and merchant-bound shipping creation.
- Added a lightweight `/api/health` endpoint for deployment smoke checks.
- Added merchant scoping to order/customer reads and order updates.
- Added cross-merchant customer ownership validation when creating orders.
- Protected shipping quotes with the same API authentication boundary.
- Prevented a caller from submitting another merchant's `merchantId`.
- Kept the existing IMIR rate table and IMIR client contract intact.
- Added a production-oriented `.env.example`.

## Fixes applied after RC review
- Shipping creation now requires a real `orderId` and verifies merchant ownership.
- Duplicate shipment creation is rejected with HTTP 409.
- The IMIR request is enriched from the trusted Orderia order/customer/items data.
- A successful IMIR response now creates the local `Shipment` record and marks the order as `shipped`.

## Required before production
1. Install dependencies and run `npx prisma generate`.
2. Configure a real PostgreSQL `DATABASE_URL` and run Prisma migrations.
3. Configure `ORDERIA_API_KEYS` with real per-merchant keys/IDs.
4. Configure the real IMIR API host, token, create-parcel path and tracking path.
5. Run `npm run typecheck` and `npm run build` in an environment with dependencies installed.
6. Connect a real merchant authentication/onboarding UI if the product is to be used as a multi-merchant SaaS dashboard rather than as an API-first foundation.
7. GitHub publication is still blocked by the connected integration returning HTTP 403 for repository writes.
8. A Vercel preview test was started separately; the throwaway validation deployment did not contain the release files and must not be treated as the Orderia release.

## Verification note
A full dependency installation was attempted in the working environment but did not finish within the available execution window. Therefore this artifact is a release candidate, not a claim of a successful production build.
\n\n## RC v6 verification update\n- Shipment creation now resolves/creates the merchant-scoped IMIR provider record before storing the shipment.\n- Tracking now requires a merchant-owned local shipment before querying IMIR.\n- Concurrent duplicate shipment creation is converted to HTTP 409 when Prisma reports P2002.\n- Full npm install/build could not be completed in the execution environment because package installation timed out; this is not treated as a successful build.\n