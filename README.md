# Orderia 5.5.0 — merged foundation

هذه حزمة تجميعية تضم:
- Prisma/PostgreSQL schema
- Customers & Orders APIs
- Dashboard pages
- Shipping quote/create/track routes
- IMIR rate table and client

## ما تم إصلاحه في RC v9\n- نموذج تسجيل الدخول ينتقل إلى Dashboard عند الإرسال من المتصفح.\n- مركز الشحن يحسب السعر من جدول IMIR مباشرة داخل Dashboard بدل استدعاء API محمي بدون مفتاح.\n\n## قبل الإنتاج
1. تثبيت الحزم.
2. ضبط `DATABASE_URL`.
3. تنفيذ `npx prisma generate`.
4. تنفيذ migrations على قاعدة PostgreSQL.
5. ضبط متغيرات IMIR الرسمية.
6. مراجعة مسارات IMIR الرسمية قبل تفعيل إنشاء الشحنات والتتبع في الإنتاج.

> هذه الحزمة لا تعني أن مستودع GitHub أو نشر Vercel تم تحديثهما؛ الدمج هنا محلي في ملف واحد.
