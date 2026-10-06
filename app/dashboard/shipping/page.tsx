import { db } from "@/lib/db";
import { getDashboardMerchantId } from "@/lib/dashboard-auth";
import { getImirRate } from "@/lib/shipping/imir-rates";
import { imirRequest } from "@/lib/shipping/imir-client";

type SearchParams = Promise<{
  wilaya_id?: string;
  method?: string;
  tracking?: string;
}>;

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

  const method =
    params.method === "stopdesk" ? "stopdesk" : "home";

  const quote =
    Number.isInteger(wilayaId) && wilayaId > 0
      ? getImirRate(wilayaId, method)
      : null;

  const tracking = params.tracking?.trim() ?? "";

  let trackingResult: {
    shipment: {
      id: string;
      orderId: string;
      trackingNo: string | null;
      status: string;
      method: string;
      wilayaId: number | null;
      fee: number;
    };
    data: unknown;
  } | null = null;

  let trackingError: string | null = null;

  if (tracking) {
    const shipment = await db.shipment.findFirst({
      where: {
        merchantId,
        trackingNo: tracking,
      },
      select: {
        id: true,
        orderId: true,
        trackingNo: true,
        status: true,
        method: true,
        wilayaId: true,
        fee: true,
      },
    });

    if (!shipment) {
      trackingError =
        "لم يتم العثور على شحنة بهذا الرقم ضمن حسابك.";
    } else {
  try {
    const template =
      process.env.IMIR_TRACKING_PATH ||
      "/api/v1/track/{tracking}";

    const path = template.replace(
      "{tracking}",
      encodeURIComponent(tracking),
    );

    const data = await imirRequest({ path });

    trackingResult = {
      shipment,
      data,
    };
  } catch (error) {
    trackingError =
      error instanceof Error
        ? error.message
        : "تعذر الاتصال بـ IMIR.";
  }
}
}

  return (
    <main
      dir="rtl"
      style={{
        padding: 24,
        fontFamily: "Arial",
        maxWidth: 900,
        margin: "0 auto",
      }}
    >
      <h1>مركز الشحن</h1>

      <p>
        حساب تكلفة الشحن وتتبع الشحنات.
      </p>

      <section
        style={{
          marginTop: 20,
          padding: 18,
          border: "1px solid #ddd",
          borderRadius: 12,
          maxWidth: 560,
        }}
      >
        <h2>تتبع شحنة</h2>

        <p>
          أدخل رقم التتبع لمعرفة حالة الشحنة.
        </p>

        <form
          method="get"
          style={{
            display: "grid",
            gap: 10,
          }}
        >
          <input
            name="tracking"
            placeholder="أدخل رقم التتبع، مثال: ECMQXR2610061173159"
            defaultValue={tracking}
            style={{
              padding: 12,
              borderRadius: 8,
              border: "1px solid #ccc",
              fontSize: 16,
              direction: "ltr",
              textAlign: "left",
            }}
          />

          <button
            type="submit"
            style={{
              padding: 12,
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            البحث عن الشحنة
          </button>
        </form>

        {trackingError && (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 8,
              border: "1px solid #ddd",
            }}
          >
            {trackingError}
          </div>
        )}

        {trackingResult && (
          <div style={{ marginTop: 20 }}>
            <h3>الشحنة موجودة ✓</h3>

            <p>
              <strong>رقم التتبع:</strong>{" "}
              {trackingResult.shipment.trackingNo}
            </p>

            <p>
              <strong>الحالة في Orderia:</strong>{" "}
              {trackingResult.shipment.status}
            </p>

            <p>
              <strong>طريقة التوصيل:</strong>{" "}
              {trackingResult.shipment.method === "stopdesk"
                ? "Stop Desk"
                : "التوصيل للمنزل"}
            </p>

            <p>
              <strong>ولاية الشحن:</strong>{" "}
              {trackingResult.shipment.wilayaId}
            </p>

            <p>
              <strong>تكلفة الشحن:</strong>{" "}
              {trackingResult.shipment.fee.toLocaleString(
                "ar-DZ",
              )}{" "}
              دج
            </p>

            <details style={{ marginTop: 16 }}>
              <summary>
                بيانات التتبع من IMIR
              </summary>

              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  direction: "ltr",
                  textAlign: "left",
                  overflowX: "auto",
                  marginTop: 10,
                  padding: 12,
                  borderRadius: 8,
                  background: "#f5f5f5",
                }}
              >
                {JSON.stringify(
                  trackingResult.data,
                  null,
                  2,
                )}
              </pre>
            </details>
          </div>
        )}
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>حساب تكلفة الشحن</h2>

        <form
          method="get"
          style={{
            display: "grid",
            gap: 10,
            maxWidth: 360,
          }}
        >
          <input
            name="wilaya_id"
            placeholder="رقم الولاية"
            type="number"
            min="1"
            defaultValue={params.wilaya_id ?? ""}
            style={{
              padding: 12,
              borderRadius: 8,
              border: "1px solid #ccc",
            }}
          />

          <select
            name="method"
            defaultValue={method}
            style={{
              padding: 12,
              borderRadius: 8,
              border: "1px solid #ccc",
            }}
          >
            <option value="home">
              التوصيل للمنزل
            </option>

            <option value="stopdesk">
              Stop Desk
            </option>
          </select>

          <button
            type="submit"
            style={{
              padding: 12,
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
            }}
          >
            حساب السعر
          </button>
        </form>

        {params.wilaya_id && (
          <section
            style={{
              marginTop: 20,
              padding: 18,
              border: "1px solid #ddd",
              borderRadius: 12,
            }}
          >
            {quote ? (
              <>
                <strong>السعر المحسوب</strong>

                <h2>
                  {quote.fee.toLocaleString("ar-DZ")} دج
                </h2>

                <p>
                  IMIR / EcoTrack —{" "}
                  {method === "home"
                    ? "توصيل للمنزل"
                    : "Stop Desk"}
                </p>
              </>
            ) : (
              <p>
                لا يوجد سعر متاح لهذه الولاية
                وطريقة التوصيل.
              </p>
            )}
          </section>
        )}
      </section>
    </main>
  );
}
