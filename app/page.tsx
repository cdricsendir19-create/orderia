import Link from "next/link";

export default function HomePage() {
  return (
    <main
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: "#f7f7f5",
        fontFamily: "Arial, sans-serif",
        color: "#17202a",
      }}
    >
      <section style={{ maxWidth: 960, margin: "0 auto", padding: "72px 24px" }}>
        <div
          style={{
            display: "inline-block",
            padding: "7px 12px",
            borderRadius: 999,
            background: "#e8eef7",
            color: "#315b8f",
            fontSize: 14,
          }}
        >
          ORDERIA · الإصدار 5.5.0
        </div>

        <h1
          style={{
            fontSize: "clamp(38px, 8vw, 68px)",
            lineHeight: 1.05,
            margin: "22px 0 16px",
          }}
        >
          كل طلبات متجرك في مكان واحد.
        </h1>

        <p
          style={{
            maxWidth: 680,
            fontSize: 20,
            lineHeight: 1.8,
            color: "#5b6570",
            margin: 0,
          }}
        >
          إدارة الطلبات والعملاء والشحن للتجار، بواجهة عربية بسيطة ومهيأة للسوق الجزائري.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 32 }}>
          <Link
            href="/dashboard"
            style={{
              textDecoration: "none",
              background: "#17202a",
              color: "#fff",
              padding: "13px 20px",
              borderRadius: 10,
            }}
          >
            الدخول إلى لوحة التحكم
          </Link>

          <Link
            href="/api/health"
            style={{
              textDecoration: "none",
              background: "#fff",
              color: "#17202a",
              padding: "13px 20px",
              borderRadius: 10,
              border: "1px solid #d9dde2",
            }}
          >
            فحص حالة النظام
          </Link>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
            gap: 14,
            marginTop: 56,
          }}
        >
          {[
            ["الطلبات", "متابعة الطلبات وحالاتها"],
            ["العملاء", "بيانات العملاء في مكان واحد"],
            ["الشحن", "إدارة عمليات الشحن والتوصيل"],
          ].map(([title, text]) => (
            <article
              key={title}
              style={{
                background: "#fff",
                border: "1px solid #e3e6e8",
                borderRadius: 16,
                padding: 20,
              }}
            >
              <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>{title}</h2>
              <p style={{ margin: 0, color: "#68717b", lineHeight: 1.7 }}>
                {text}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
