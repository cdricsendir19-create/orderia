# Orderia — Production Launch Checklist

## Infrastructure
- [ ] Create PostgreSQL database and set `DATABASE_URL`.
- [ ] Set a 32+ byte `AUTH_SECRET`.
- [ ] Set `ENCRYPTION_KEY` to 32 bytes / 64 hex characters.
- [ ] Set `NEXT_PUBLIC_APP_URL` to the production URL.
- [ ] Set `CRON_SECRET` and protect worker endpoints with it.

## Shopify
- [ ] Set `SHOPIFY_CLIENT_ID` and `SHOPIFY_CLIENT_SECRET`.
- [ ] Set the exact production OAuth callback URL.
- [ ] Configure Shopify webhook URL and HMAC secret handling.
- [ ] Test product, customer, order and fulfillment synchronization.

## Shipping
- [ ] Configure each carrier's base URL and bearer token only in the production secret store.
- [ ] Run connection health check.
- [ ] Verify one quote for HOME and one for STOP_DESK.
- [ ] Create one test shipment.
- [ ] Verify tracking synchronization.
- [ ] Verify cancellation and return behavior.
- [ ] For IMIR/EcoTrack, use only endpoint paths confirmed by its official API documentation.

## Database
- [ ] Run `npm run prisma:generate`.
- [ ] Apply the Prisma schema with the chosen migration strategy.
- [ ] Create a test owner account.
- [ ] Verify tenant isolation with two stores.

## Release gate
- [ ] `npm run build` succeeds in a full Node environment.
- [ ] `/api/health` returns healthy.
- [ ] `/api/system/status` does not expose secrets.
- [ ] Login/register/logout works.
- [ ] Order → shipment → tracking → Shopify fulfillment flow passes.
- [ ] Worker authentication rejects missing/invalid cron secret.
- [ ] No secrets are committed to Git.
