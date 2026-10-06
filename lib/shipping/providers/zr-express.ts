import {
  type CreateShipmentInput,
  type CreatedShipment,
  type ShippingProviderAdapter,
  type ShippingQuote,
  type ShippingQuoteInput,
  type TrackingResult,
} from "./types";
import { zrExpressRequest } from "./zr-express-client";

function getRates(): Record<number, { home: number; stopdesk: number }> {
  const raw = process.env.ZR_EXPRESS_RATES;

  if (!raw) return {};

  try {
    return JSON.parse(raw) as Record<
      number,
      { home: number; stopdesk: number }
    >;
  } catch {
    throw new Error("ZR_EXPRESS_RATES must be valid JSON");
  }
}

function getPath(name: string) {
  const path = process.env[name];

  if (!path) {
    throw new Error(`${name} is required`);
  }

  return path;
}

export const zrExpressProvider: ShippingProviderAdapter = {
  code: "zr-express",
  name: "ZR Express",

  async quote(input: ShippingQuoteInput): Promise<ShippingQuote> {
    const rates = getRates();
    const rate = rates[input.wilayaId];

    if (!rate) {
      return {
        provider: "zr-express",
        providerName: "ZR Express",
        wilayaId: input.wilayaId,
        method: input.method,
        fee: 0,
        available: false,
        reason: "ZR Express rate is not configured for this wilaya",
      };
    }

    const fee = rate[input.method];

    if (fee === undefined || fee === null || fee <= 0) {
      return {
        provider: "zr-express",
        providerName: "ZR Express",
        wilayaId: input.wilayaId,
        method: input.method,
        fee: 0,
        available: false,
        reason: "ZR Express delivery method is unavailable",
      };
    }

    return {
      provider: "zr-express",
      providerName: "ZR Express",
      wilayaId: input.wilayaId,
      method: input.method,
      fee,
      available: true,
    };
  },

  async createShipment(
    input: CreateShipmentInput,
  ): Promise<CreatedShipment> {
    const response = await zrExpressRequest<unknown>({
      path: getPath("ZR_EXPRESS_CREATE_PATH"),
      method: "POST",
      body: {
        Tracking: "",
        TypeLivraison: input.method === "home" ? "0" : "1",
        TypeColis: "0",
        Confrimee: "1",
        Client: input.customerName,
        MobileA: input.phone,
        MobileB: "",
        Adresse: input.address,
        IDWilaya: String(input.wilayaId),
        Commune: input.commune,
        Total: String(input.amount),
        Note: input.notes ?? "",
        TProduit: input.product,
        id_Externe: input.orderId,
        Source: "Orderia",
      },
    });

    const trackingNo = extractTracking(response);

    return {
      provider: "zr-express",
      trackingNo,
      status: trackingNo ? "created" : "pending",
      raw: response,
    };
  },

  async track(trackingNo: string): Promise<TrackingResult> {
    const response = await zrExpressRequest<unknown>({
      path: getPath("ZR_EXPRESS_TRACK_PATH"),
      method: "POST",
      body: {
        Tracking: trackingNo,
      },
    });

    return {
      provider: "zr-express",
      trackingNo,
      status: extractStatus(response),
      raw: response,
    };
  },
};

function extractTracking(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;

  const candidates = [
    record.Tracking,
    record.tracking,
    record.trackingNo,
    record.TrackingNo,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

function extractStatus(value: unknown): string {
  if (!value || typeof value !== "object") return "unknown";

  const record = value as Record<string, unknown>;

  const candidates = [
    record.Statut,
    record.status,
    record.Status,
    record.etat,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return "unknown";
}
