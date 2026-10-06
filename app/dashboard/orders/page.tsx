import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getDashboardMerchantId } from "@/lib/dashboard-auth";
import { getImirRate } from "@/lib/shipping/imir-rates";
import { imirRequest } from "@/lib/shipping/imir-client";

function extractTrackingNo(value: unknown): string | null {
  const preferred = [
    "trackingNo",
    "tracking_no",
    "tracking",
    "tracking_number",
    "trackingNumber",
    "code",
    "code_suivi",
    "numero_suivi",
    "parcel_code",
    "order_code",
    "id_colis",
  ];

  const visit = (node: unknown): string | null => {
    if (!node || typeof node !== "object") return null;

    const record = node as Record<string, unknown>;

    for (const key of preferred) {
      const candidate = record[key];

      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }

      if (typeof candidate === "number") {
        return String(candidate);
      }
    }

    for (const child of Object.values(record)) {
      const found = visit(child);
      if (found) return found;
    }

    return null;
  };

  return visit(value);
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "حدث خطأ غير معروف.";
}

async function createOrder(formData: FormData) {
  "use server";

  const merchantId = await getDashboardMerchantId();

  if (!merchantId) {
    redirect("/dashboard/orders?error=session");
  }

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const wilayaRaw = String(formData.get("wilayaId") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();

  const quantity = Number(formData.get("quantity") ?? 1);
  const unitPrice = Number(formData.get("unitPrice") ?? 0);

  if (!name) {
    redirect("/dashboard/orders?error=name");
  }

  if (!phone) {
    redirect("/dashboard/orders?error=phone");
  }

  if (!title) {
    redirect("/dashboard/orders?error=title");
  }

  if (!Number.isFinite(quantity) || quantity < 1) {
    redirect("/dashboard/orders?error=quantity");
  }

  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    redirect("/dashboard/orders?error=price");
  }

  const wilayaId = wilayaRaw ? Number(wilayaRaw) : null;

  if (
    wilayaId !== null &&
    (!Number.isInteger(wilayaId) ||
      wilayaId < 1 ||
      wilayaId > 58)
  ) {
    redirect("/dashboard/orders?error=wilaya");
  }

  try {
    const customer = await db.customer.create({
      data: {
        merchantId,
        name,
        phone,
        wilayaId,
        address: address || null,
      },
    });

    const order = await db.order.create({
      data: {
        merchantId,
        customerId: customer.id,
        status: "pending",
        total: Math.round(quantity * unitPrice),
        currency: "DZD",
        items: {
          create: {
            title,
            quantity: Math.round(quantity),
            unitPrice: Math.round(unitPrice),
          },
        },
      },
      select: {
        id: true,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/orders");
    revalidatePath("/dashboard/customers");

    redirect(
      `/dashboard/orders?success=created&order=${encodeURIComponent(order.id)}`,
    );
  } catch (error) {
    console.error("Orderia create order error:", error);

    redirect(
      `/dashboard/orders?error=${encodeURIComponent(
        errorMessage(error),
      )}`,
    );
  }
}

async function createShipment(formData: FormData) {
  "use server";

  const merchantId = await getDashboardMerchantId();

  if (!merchantId) {
    redirect("/dashboard/orders?error=session");
  }

  const orderId = String(formData.get("orderId") ?? "").trim();
  const method =
    formData.get("method") === "stopdesk" ? "stopdesk" : "home";
  const commune = String(formData.get("commune") ?? "").trim();
  const wilayaId = Number(formData.get("wilayaId") ?? "");

  if (!orderId) {
    redirect("/dashboard/orders?error=shipment-order");
  }

  if (!commune) {
    redirect("/dashboard/orders?error=commune");
  }

  if (
    !Number.isInteger(wilayaId) ||
    wilayaId < 1 ||
    wilayaId > 58
  ) {
    redirect("/dashboard/orders?error=shipment-wilaya");
  }

  const order = await db.order.findFirst({
    where: {
      id: orderId,
      merchantId,
    },
    include: {
      customer: true,
      shipment: true,
      items: true,
    },
  });

  if (!order) {
    redirect("/dashboard/orders?error=order-not-found");
  }

  if (order.shipment) {
    redirect("/dashboard/orders?error=shipment-exists");
  }

  const quote = getImirRate(wilayaId, method);

  if (!quote) {
    redirect("/dashboard/orders?error=rate");
  }

  const product =
    order.items
      .map((item) => `${item.title} x${item.quantity}`)
      .join(", ")
      .slice(0, 255) || `Commande ${order.id}`;

  const imirPath =
    process.env.IMIR_CREATE_PARCEL_PATH ||
    "/api/v1/create/order";

  try {
    const imirResponse = await imirRequest<unknown>({
      path: imirPath,
      method: "POST",
      body: {
        nom_client: order.customer?.name ?? "Client Orderia",
        telephone: order.customer?.phone ?? "",
        adresse: order.customer?.address ?? "",
        code_wilaya: String(wilayaId),
        commune,
        montant: String(order.total + quote.fee),
        produit: product,
        remarque: order.notes ?? "",
        weight: "1",
        reference: order.id,
        stop_desk: method === "stopdesk" ? "1" : "0",
        type: "1",
      },
    });

    const trackingNo = extractTrackingNo(imirResponse);

    await db.shipment.create({
      data: {
        merchantId,
        orderId: order.id,
        method,
        wilayaId,
        fee: quote.fee,
        trackingNo,
        status: trackingNo ? "shipped" : "pending",
      },
    });

    await db.order.update({
      where: {
        id: order.id,
      },
      data: {
        status: trackingNo ? "shipped" : "processing",
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/orders");
    revalidatePath("/dashboard/shipping");

    redirect(
      `/dashboard/orders?success=shipment&order=${encodeURIComponent(
        order.id,
      )}`,
    );
  } catch (error) {
    console.error("Orderia IMIR shipment error:", error);

    redirect(
      `/dashboard/orders?error=${encodeURIComponent(
        errorMessage(error),
      )}`,
    );
  }
}

function getErrorMessage(error: string | undefined): string | null {
  if (!error) return null;

  const messages: Record<string, string> = {
    session: "انتهت جلسة الدخول. سجّل الدخول من جديد.",
    name: "اسم العميل مطلوب.",
    phone: "رقم الهاتف مطلوب.",
    title: "اسم المنتج مطلوب.",
    quantity: "الكمية غير صحيحة.",
    price: "سعر الوحدة غير صحيح.",
    wilaya: "رقم الولاية يجب أن يكون بين 1 و58.",
    "shipment-order": "لم يتم تحديد الطلب.",
    commune: "البلدية مطلوبة.",
    "shipment-wilaya": "رقم الولاية غير صحيح.",
    "order-not-found": "الطلب غير موجود.",
    "shipment-exists": "تم إنشاء شحنة لهذا الطلب مسبقًا.",
    rate: "تعذر العثور على سعر الشحن لهذه الولاية.",
  };

  return messages[error] ?? error;
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
}) {
  const merchantId = await getDashboardMerchantId();

  if (!merchantId) {
    return (
      <main dir="rtl" style={{ padding: 24 }}>
        <h1>الطلبات</h1>

        <div
          style={{
            padding: 16,
            border: "1px solid #f0b4b4",
            borderRadius: 12,
            background: "#fff5f5",
            color: "#a00",
          }}
        >
          سجّل الدخول أولًا من لوحة التحكم.
        </div>
      </main>
    );
  }

  const params = await searchParams;

  const orders = await db.order.findMany({
    where: {
      merchantId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
    include: {
      customer: true,
      shipment: true,
      items: true,
    },
  });

  const error = getErrorMessage(params.error);

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
      <h1 style={{ marginBottom: 8 }}>
        الطلبات
      </h1>

      <p style={{ color: "#666", marginTop: 0 }}>
        أنشئ طلب COD جديدًا ثم أرسله لاحقًا إلى مركز الشحن.
      </p>

      {params.success === "created" && (
        <div
          style={{
            margin: "16px 0",
            padding: 14,
            border: "1px solid #b7dfc0",
            borderRadius: 12,
            background: "#f1fff4",
            color: "#176b2c",
            fontWeight: 700,
          }}
        >
          تم إنشاء الطلب بنجاح.
        </div>
      )}

      {params.success === "shipment" && (
        <div
          style={{
            margin: "16px 0",
            padding: 14,
            border: "1px solid #b7dfc0",
            borderRadius: 12,
            background: "#f1fff4",
            color: "#176b2c",
            fontWeight: 700,
          }}
        >
          تم إنشاء الشحنة بنجاح.
        </div>
      )}

      {error && (
        <div
          style={{
            margin: "16px 0",
            padding: 14,
            border: "1px solid #e5a5a5",
            borderRadius: 12,
            background: "#fff4f4",
            color: "#a00000",
            fontWeight: 700,
            overflowWrap: "anywhere",
          }}
        >
          خطأ: {error}
        </div>
      )}

      <section
        style={{
          padding: 18,
          border: "1px solid #ddd",
          borderRadius: 14,
          margin: "20px 0",
          background: "#fafafa",
        }}
      >
        <h2 style={{ marginTop: 0 }}>
          إضافة طلب جديد
        </h2>

        <form
          action={createOrder}
          style={{
            display: "grid",
            gap: 10,
          }}
        >
          <input
            name="name"
            required
            placeholder="اسم العميل"
            style={inputStyle}
          />

          <input
            name="phone"
            required
            placeholder="رقم الهاتف"
            inputMode="tel"
            style={inputStyle}
          />

          <input
            name="wilayaId"
            placeholder="رقم الولاية (1-58)"
            inputMode="numeric"
            style={inputStyle}
          />

          <input
            name="address"
            placeholder="العنوان"
            style={inputStyle}
          />

          <input
            name="title"
            required
            placeholder="اسم المنتج"
            style={inputStyle}
          />

          <input
            name="quantity"
            required
            defaultValue="1"
            type="number"
            min="1"
            placeholder="الكمية"
            style={inputStyle}
          />

          <input
            name="unitPrice"
            required
            type="number"
            min="0"
            placeholder="سعر الوحدة بالدج"
            style={inputStyle}
          />

          <button
            type="submit"
            style={{
              padding: "12px 16px",
              border: 0,
              borderRadius: 10,
              background: "#111",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            إنشاء الطلب
          </button>
        </form>
      </section>

      {orders.length === 0 ? (
        <div
          style={{
            padding: 18,
            border: "1px solid #ddd",
            borderRadius: 12,
          }}
        >
          لا توجد طلبات بعد.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 10,
          }}
        >
          {orders.map((order) => (
            <article
              key={order.id}
              style={{
                padding: 16,
                border: "1px solid #ddd",
                borderRadius: 12,
              }}
            >
              <strong>
                {order.customer?.name ?? "بدون عميل"}
              </strong>

              <div>
                {order.status} —{" "}
                {order.total.toLocaleString("ar-DZ")} دج
              </div>

              <div style={{ marginTop: 6 }}>
                {order.items
                  .map(
                    (item) =>
                      `${item.title} ×${item.quantity}`,
                  )
                  .join("، ")}
              </div>

              {order.shipment?.trackingNo ? (
                <small>
                  رقم التتبع: {order.shipment.trackingNo}
                </small>
              ) : order.shipment ? (
                <small>
                  تم إنشاء الشحنة وهي قيد المعالجة.
                </small>
              ) : (
                <form
                  action={createShipment}
                  style={{
                    display: "grid",
                    gap: 8,
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: "1px solid #eee",
                  }}
                >
                  <input
                    type="hidden"
                    name="orderId"
                    value={order.id}
                  />

                  <input
                    name="wilayaId"
                    required
                    type="number"
                    min="1"
                    max="58"
                    defaultValue={
                      order.customer?.wilayaId ?? ""
                    }
                    placeholder="رقم الولاية"
                    style={inputStyle}
                  />

                  <input
                    name="commune"
                    required
                    placeholder="البلدية / Commune"
                    style={inputStyle}
                  />

                  <select
                    name="method"
                    defaultValue="home"
                    style={inputStyle}
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
                      padding: "12px 16px",
                      border: 0,
                      borderRadius: 10,
                      background: "#111",
                      color: "#fff",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    إنشاء الشحنة عبر IMIR
                  </button>
                </form>
              )}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "12px",
  border: "1px solid #ccc",
  borderRadius: 10,
  background: "#fff",
};