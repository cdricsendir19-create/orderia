

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getDashboardMerchantId } from "@/lib/dashboard-auth";

async function createOrder(formData: FormData) {
"use server";
  const merchantId = await getDashboardMerchantId();

  if (!merchantId) return;

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const wilayaRaw = String(formData.get("wilayaId") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();

  const quantity = Number(formData.get("quantity") ?? 1);
  const unitPrice = Number(formData.get("unitPrice") ?? 0);

  if (
    !name ||
    !phone ||
    !title ||
    !Number.isFinite(quantity) ||
    quantity < 1 ||
    !Number.isFinite(unitPrice) ||
    unitPrice < 0
  ) {
    return;
  }

  const wilayaId = wilayaRaw ? Number(wilayaRaw) : null;

  if (
    wilayaId !== null &&
    (!Number.isInteger(wilayaId) ||
      wilayaId < 1 ||
      wilayaId > 58)
  ) {
    return;
  }

  const customer = await db.customer.create({
    data: {
      merchantId,
      name,
      phone,
      wilayaId,
      address: address || null,
    },
  });

  await db.order.create({
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
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/customers");
}

export default async function OrdersPage() {
  const merchantId = await getDashboardMerchantId();

  if (!merchantId) {
    return (
      <main dir="rtl" style={{ padding: 24 }}>
        سجّل الدخول أولًا من لوحة التحكم.
      </main>
    );
  }

  const orders = await db.order.findMany({
    where: { merchantId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      customer: true,
      shipment: true,
      items: true,
    },
  });

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
                      `${item.title} ×${item.quantity}`
                  )
                  .join("، ")}
              </div>

              <small>
                {order.shipment?.trackingNo ??
                  "لم تُنشأ شحنة"}
              </small>
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