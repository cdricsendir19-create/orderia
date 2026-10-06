import Link from "next/link";

export default function ShopifyPage() {
  return (
    <main dir="rtl" className="min-h-screen p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <p className="text-sm text-gray-500">ORDERIA 5.6</p>
          <h1 className="mt-2 text-3xl font-bold">
            ربط Shopify
          </h1>
          <p className="mt-3 text-gray-600">
            اربط متجرك في Shopify مع Orderia لاستقبال الطلبات
            وإدارتها من لوحة واحدة.
          </p>
        </div>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            Shopify
          </h2>

          <p className="mt-3 text-sm leading-6 text-gray-600">
            بعد ربط المتجر، ستتمكن Orderia من استقبال الطلبات
            الجديدة تلقائيًا وتحويلها إلى العملاء والطلبات داخل
            نظام Orderia.
          </p>

          <div className="mt-6">
            <Link
              href="/api/shopify/install"
              className="inline-flex rounded-xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
            >
              Connect Shopify
            </Link>
          </div>
        </section>

        <div className="mt-6">
          <Link
            href="/dashboard"
            className="text-sm text-gray-600 underline"
          >
            العودة إلى لوحة التحكم
          </Link>
        </div>
      </div>
    </main>
  );
}
