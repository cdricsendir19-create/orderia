import Link from "next/link";

export default function Home() {
  return (
    <main className="landing">
      <div className="hero">
        <div className="badge">ORDERIA • الإصدار 5.0</div>

        <h1>كل طلبات متجرك في مكان واحد.</h1>

        <p>
          Orderia منصة عربية لإدارة الطلبات والعملاء والشحن،
          مع بنية قابلة للربط مع Shopify وشركات التوصيل الجزائرية.
        </p>

        <div className="actions">
          <Link className="btn primary" href="/dashboard">
            فتح لوحة التحكم
          </Link>

          <Link className="btn" href="/api/health">
            فحص النظام
          </Link>
        </div>
      </div>

      <section className="features">
        <article>
          <strong>الطلبات</strong>
          <span>متابعة حالة الطلبات من لوحة واحدة.</span>
        </article>

        <article>
          <strong>الشحن</strong>
          <span>حساب Home و Stop Desk حسب الولاية.</span>
        </article>

        <article>
          <strong>قابل للتوسع</strong>
          <span>تصميم متعدد شركات الشحن وShopify.</span>
        </article>
      </section>
    </main>
  );
}
