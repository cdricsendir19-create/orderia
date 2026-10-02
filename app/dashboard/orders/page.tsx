"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getDashboardMerchantId } from "@/lib/dashboard-auth";

async function createOrder(formData: FormData) {
  const merchantId = await getDashboardMerchantId();
  if (!merchantId) return;

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const wilayaRaw = String(formData.get("wilayaId") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const quantity = Math.max(1, Number(formData.get("quantity") ?? 1));
  const unitPrice = Math.max(0, Number(formData.get("unitPrice") ?? 0));

  if (
    !name ||
    !phone ||
    !title ||
    !Number.isFinite(quantity) ||
    !Number.isFinite(unitPrice)
  ) {
    return;
  }

  const wilayaId = wilayaRaw ? Number(wilayaRaw) : null;

  if (
    wilayaId !== null &&
    (!Number.isInteger(wilayaId) || wilayaId < 1 || wilayaId > 58)
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
          quantity,
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
      customer: true