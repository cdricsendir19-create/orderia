export const SHIPPING_PROVIDER_CODES = [
  "imir",
  "zr-express",
] as const;

export type ShippingProviderCode =
  (typeof SHIPPING_PROVIDER_CODES)[number];

export function isShippingProviderCode(
  value: string,
): value is ShippingProviderCode {
  return SHIPPING_PROVIDER_CODES.includes(
    value as ShippingProviderCode,
  );
}
