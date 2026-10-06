export type ShippingMethod = "home" | "stopdesk";

export type ShippingQuoteInput = {
  wilayaId: number;
  method: ShippingMethod;
  weight?: number;
};

export type ShippingQuote = {
  provider: string;
  providerName: string;
  wilayaId: number;
  method: ShippingMethod;
  fee: number;
  available: boolean;
  reason?: string;
};

export type CreateShipmentInput = {
  orderId: string;
  customerName: string;
  phone: string;
  address: string;
  wilayaId: number;
  commune: string;
  method: ShippingMethod;
  amount: number;
  product: string;
  notes?: string;
  weight?: number;
};

export type CreatedShipment = {
  provider: string;
  trackingNo: string | null;
  status: string;
  raw?: unknown;
};

export type TrackingResult = {
  provider: string;
  trackingNo: string;
  status: string;
  raw?: unknown;
};

export interface ShippingProviderAdapter {
  readonly code: string;
  readonly name: string;

  quote(
    input: ShippingQuoteInput,
  ): Promise<ShippingQuote>;

  createShipment(
    input: CreateShipmentInput,
  ): Promise<CreatedShipment>;

  track(
    trackingNo: string,
  ): Promise<TrackingResult>;
}
