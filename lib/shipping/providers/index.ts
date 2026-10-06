import { registerShippingProvider } from "./registry";
import { zrExpressProvider } from "./zr-express";

registerShippingProvider(zrExpressProvider);

export { getShippingProvider, getShippingProviders, hasShippingProvider } from "./registry";
export type {
  ShippingMethod,
  ShippingQuoteInput,
  ShippingQuote,
  CreateShipmentInput,
  CreatedShipment,
  TrackingResult,
  ShippingProviderAdapter,
} from "./types";
