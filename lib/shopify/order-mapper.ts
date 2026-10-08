export type ShopifyOrderPayload = {
  id?: string;
  name?: string;
  email?: string | null;
  phone?: string | null;

  total_price?: string | null;
  currency?: string | null;

  financial_status?: string | null;
  fulfillment_status?: string | null;

  customer?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone?: string | null;
    default_address?: {
      address1?: string | null;
      address2?: string | null;
      city?: string | null;
      province?: string | null;
      zip?: string | null;
    } | null;
  } | null;

  shipping_address?: {
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
    address1?: string | null;
    address2?: string | null;
    city?: string | null;
    province?: string | null;
    zip?: string | null;
  } | null;

  line_items?: Array<{
    id?: string | number;
    product_id?: string | number | null;
    variant_id?: string | number | null;
    title?: string | null;
    name?: string | null;
    quantity?: number | null;
    price?: string | null;
  }>;
};

function toInt(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.round(number);
}

function clean(value: string | null | undefined) {
  return value?.trim() || "";
}

function fullName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
) {
  return [clean(firstName), clean(lastName)]
    .filter(Boolean)
    .join(" ")
    .trim();
}

export function mapShopifyOrder(order: ShopifyOrderPayload) {
  const shippingAddress = order.shipping_address;
  const customerAddress = order.customer?.default_address;

  const firstName =
    shippingAddress?.first_name ??
    order.customer?.first_name ??
    "";

  const lastName =
    shippingAddress?.last_name ??
    order.customer?.last_name ??
    "";

  const customerName =
    fullName(firstName, lastName) ||
    clean(order.name) ||
    "Shopify Customer";

  const phone =
    clean(shippingAddress?.phone) ||
    clean(order.phone) ||
    clean(order.customer?.phone);

  const address = [
    shippingAddress?.address1 ?? customerAddress?.address1,
    shippingAddress?.address2 ?? customerAddress?.address2,
    shippingAddress?.city ?? customerAddress?.city,
    shippingAddress?.province ?? customerAddress?.province,
    shippingAddress?.zip ?? customerAddress?.zip,
  ]
    .map(clean)
    .filter(Boolean)
    .join(", ");

  const items = (order.line_items ?? []).map((item) => ({
    externalId:
      item.id !== undefined && item.id !== null
        ? String(item.id)
        : null,

    productId:
      item.product_id !== undefined &&
      item.product_id !== null
        ? String(item.product_id)
        : null,

    title:
      clean(item.name) ||
      clean(item.title) ||
      "Shopify product",

    quantity:
      Number.isFinite(Number(item.quantity)) &&
      Number(item.quantity) > 0
        ? Math.trunc(Number(item.quantity))
        : 1,

    unitPrice: toInt(item.price),
  }));

  const total = toInt(order.total_price);

  return {
    externalId: clean(order.id ? String(order.id) : ""),
    externalNumber: clean(order.name),

    customer: {
      name: customerName,
      phone,
      address: address || null,
      wilayaId: null,
    },

       order: {
      status: "pending",
      total,
      currency: clean(order.currency) || "DZD",
      notes: `Shopify ${clean(order.name)}`,
      items,
    },
  };
}