const tariffs: Record<number, { home: number; stopdesk: number }> = {
  1: { home: 1300, stopdesk: 900 },
  2: { home: 850, stopdesk: 450 },
  3: { home: 950, stopdesk: 550 },
  4: { home: 850, stopdesk: 450 },
  5: { home: 900, stopdesk: 500 },
  6: { home: 800, stopdesk: 450 },
  7: { home: 950, stopdesk: 550 },
  8: { home: 1000, stopdesk: 650 },
  9: { home: 650, stopdesk: 400 },
  10: { home: 700, stopdesk: 550 },
  11: { home: 1500, stopdesk: 1100 },
  12: { home: 900, stopdesk: 0 },
  13: { home: 900, stopdesk: 500 },
  14: { home: 850, stopdesk: 0 },
  15: { home: 750, stopdesk: 450 },
  16: { home: 450, stopdesk: 300 },
  17: { home: 950, stopdesk: 500 },
  18: { home: 900, stopdesk: 0 },
  19: { home: 800, stopdesk: 450 },
  20: { home: 900, stopdesk: 0 },
  21: { home: 900, stopdesk: 450 },
  22: { home: 900, stopdesk: 0 },
  23: { home: 850, stopdesk: 450 },
  24: { home: 900, stopdesk: 450 },
  25: { home: 800, stopdesk: 450 },
  26: { home: 800, stopdesk: 0 },
  27: { home: 900, stopdesk: 450 },
  28: { home: 850, stopdesk: 500 },
  29: { home: 900, stopdesk: 0 },
  30: { home: 950, stopdesk: 600 },
  31: { home: 800, stopdesk: 450 },
  32: { home: 1000, stopdesk: 0 },
  34: { home: 800, stopdesk: 450 },
  35: { home: 650, stopdesk: 0 },
  36: { home: 850, stopdesk: 0 },
  38: { home: 900, stopdesk: 0 },
  39: { home: 950, stopdesk: 600 },
  40: { home: 900, stopdesk: 0 },
  41: { home: 900, stopdesk: 450 },
  42: { home: 650, stopdesk: 450 },
  43: { home: 900, stopdesk: 450 },
  44: { home: 900, stopdesk: 0 },
  45: { home: 1000, stopdesk: 0 },
  46: { home: 900, stopdesk: 0 },
  47: { home: 950, stopdesk: 450 },
  48: { home: 900, stopdesk: 450 },
  49: { home: 1300, stopdesk: 0 },
  51: { home: 950, stopdesk: 0 },
  52: { home: 1000, stopdesk: 0 },
  53: { home: 1500, stopdesk: 0 },
  54: { home: 1500, stopdesk: 0 },
  55: { home: 950, stopdesk: 0 },
  57: { home: 950, stopdesk: 0 },
  58: { home: 1000, stopdesk: 0 },
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const wilayaId = Number(searchParams.get("wilaya_id"));
  const method = searchParams.get("method");

  if (!Number.isInteger(wilayaId)) {
    return Response.json(
      {
        ok: false,
        error: "wilaya_id must be an integer.",
      },
      { status: 400 }
    );
  }

  if (method !== "home" && method !== "stopdesk") {
    return Response.json(
      {
        ok: false,
        error: "method must be home or stopdesk.",
      },
      { status: 400 }
    );
  }

  const tariff = tariffs[wilayaId];

  if (!tariff) {
    return Response.json(
      {
        ok: false,
        error: "No configured tariff for this wilaya.",
        wilaya_id: wilayaId,
      },
      { status: 404 }
    );
  }

  const price = tariff[method];

  return Response.json({
    ok: true,
    wilaya_id: wilayaId,
    method,
    price_dzd: price,
    currency: "DZD",
    source: "configured_tariff",
    live_provider_call: false,
  });
  }
