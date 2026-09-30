import { getDashboardMerchantId } from "@/lib/dashboard-auth";
import { getImirRate } from "@/lib/shipping/imir-rates";

type SearchParams = Promise<{ wilaya_id?: string; method?: string }>;

export default async function ShippingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const merchantId = await getDashboardMerchantId();
  if (!merchantId) {
    return (
      <main dir="rtl" style={{ padding: 24, fontFamily: "Arial" }}>
        سجّل الدخول أولًا من لوحة التحكم.
      </main>
    );
  }

  const params = await searchParams;
  const wilayaId = Number(params.wilaya_id ?? "");
  const method = params.method === "stopdesk" ? "stopdesk" : "home";
  const quote =
    Number.isInteger(wilayaId) && wilayaId > 0
      ? getImirRate(wilayaId, method)
      : null;

  return (
    <main dir="rtl" style={{ padding: 24, fontFamily: "Arial" }}>
      <h1>مركز الشحن</h1>
      <p>حساب تكلفة الشحن حسب الولاية وطريقة التوصيل.</p>
      <form
        method="get"
        style={{ display: "grid", gap: 10, maxWidth: 360 }}
      >
        <input
          name="wilaya_id"
          placeholder="رقم الولاية"
          type="number"
          min="1"
          defaultValue={params.wilaya_id ?? ""}
        />
        <select name="method" defaultValue={method}>
          <option value="home">التوصيل للمنزل</option>
          <option value="stopdesk">Stop Desk</option>
        </select>
        <button type="submit">حساب السعر</button>
      </form>

      {params.wilaya_id && (
        <section style={{ marginTop: 20, padding: 18, border: "1px solid #ddd", borderRadius: 12 }}>
          {quote ? (
            <>
              <strong>السعر المحسوب</strong>
              <h2>{quote.fee.toLocaleString("ar-DZ")} دج</h2>
              <p>IMIR / EcoTrack — {method === "home" ? "توصيل للمنزل" : "Stop Desk"}</p>
            </>
          ) : (
            <p>لا يوجد سعر متاح لهذه الولاية وطريقة التوصيل.</p>
          )}
        </section>
      )}
    </main>
  );
}
