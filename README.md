# Orderia

Orderia is an Arabic-first SaaS foundation for ecommerce operations.

## Current milestone: 5.0 MVP foundation

Included: Arabic RTL landing page, merchant dashboard shell, health endpoint, system status endpoint, and a shipping quote API using the configured Algeria tariff table.

Not yet enabled: PostgreSQL persistence, merchant authentication, Shopify OAuth/webhooks, live IMIR/EcoTrack API calls, other carrier integrations, and production order/inventory workflows.

Provider-specific API paths and payloads must be implemented only from the carrier's official documentation.

## Run

```bash
npm install
npm run typecheck
npm run build
npm start
```
