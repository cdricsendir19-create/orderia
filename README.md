# Orderia 4.4

منصة SaaS عربية لإدارة المتاجر والطلبات والعملاء والشحن والتكامل مع Shopify.

## v3.5 — Live Provider Quoting & Operations

- Smart Shipping now evaluates store-connected live HTTP providers for quotes, including providers that do not have a local simulator.
- The shipping quote API is tenant-scoped and uses the current store connection configuration.
- Shipping connections expose `LIVE_HTTP` versus `LOCAL_SIMULATION` mode without exposing credentials.
- Connection writes validate HTTPS base URLs and API paths before encryption/storage.
- A dependency-free `release:check` validates required production files, cron routes, and shipping/worker safeguards.
- This release still does **not** claim a verified IMIR/EcoTrack production endpoint or payload; provider-specific API semantics must be configured from the carrier's official documentation.

## ما هو موجود
- حسابات وتسجيل دخول وجلسات مشفرة وعزل متعدد المتاجر.
- منتجات، عملاء، طلبات ومخزون.
- محرك شحن موحد مع EcoTrack/IMIR وتعريفات الولاية Home/Stop Desk.
- إعدادات شركات الشحن المشفرة واختبار الاتصال.
- قواعد اختيار شركة الشحن تلقائياً.
- إنشاء الشحنات، التتبع، الإلغاء، المرتجعات، Jobs وCron.
- Shopify OAuth، مزامنة المنتجات والعملاء والطلبات وFulfillment وWebhooks.
- تحليلات تشغيلية، إعدادات المتجر، إشعارات وسجل تدقيق.
- واجهة عربية RTL ومتجاوبة.

## تشغيل
1. أنشئ PostgreSQL وضع `DATABASE_URL`.
2. انسخ `.env.example` إلى `.env` وأدخل الأسرار.
3. نفذ `npm install` ثم `npx prisma generate`.
4. في بيئة جديدة استخدم `npx prisma db push` أو migrations حسب سياسة قاعدة البيانات.
5. شغل `npm run dev`.

## الشحن الحقيقي
Orderia لا يفترض مسارات API غير موثقة. يجب إدخال Base URL وToken ومسارات شركة الشحن الرسمية في مركز الشحن، ثم تنفيذ اختبار الاتصال. تعرفة IMIR المدمجة محلية وليست دليلاً على اتصال API مباشر.

## الإنتاج
- قبل الإطلاق شغّل `npm run release:gate`، ثم `npx prisma migrate deploy` على قاعدة الإنتاج.
- ضع الأسرار في Vercel Environment Variables، ولا تضعها في Git.
- اضبط `CRON_SECRET` لحماية Workers.
- استخدم PostgreSQL إنتاجية مع نسخ احتياطية.
- نفذ `prisma migrate deploy` في CI/CD عند اعتماد migrations.
- راقب Logs وWebhooks وحالات Jobs.

## ملاحظة التحقق
هذه النسخة لم تُعتبر منشورة أو متصلة بخدمات خارجية لمجرد وجود الكود. يلزم ربط قاعدة البيانات وبيئة النشر وبيانات API الفعلية ثم إجراء اختبار تكاملي.


## v3.2 Production hardening
- Security response headers
- Secrets and build artifacts excluded from Git
- CI works without requiring a committed lockfile
- System status avoids exposing runtime environment details

## v3.4 reliability hardening
- Vercel Cron workers support both GET and POST.
- Cron workers fail closed when `CRON_SECRET` is missing.
- Shipping jobs use an atomic claim to reduce duplicate processing.
- Tracking events avoid repeated location-only duplicates.
- Remote shipment creation carries the internal request key for provider-side idempotency when supported.
- Shopify fulfillment jobs respect `autoShopifyFulfillment`.
