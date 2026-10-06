export type ZrExpressRequest = {
  path: string;
  method?: "GET" | "POST";
  body?: unknown;
};

export async function zrExpressRequest<T>({
  path,
  method = "GET",
  body,
}: ZrExpressRequest): Promise<T> {
  const baseUrl = process.env.ZR_EXPRESS_API_BASE_URL;
  const apiKey = process.env.ZR_EXPRESS_API_KEY;
  const tenant = process.env.ZR_EXPRESS_TENANT;

  if (!baseUrl) {
    throw new Error("ZR_EXPRESS_API_BASE_URL is required");
  }

  if (!apiKey || !tenant) {
    throw new Error(
      "ZR_EXPRESS_API_KEY and ZR_EXPRESS_TENANT are required",
    );
  }

  const response = await fetch(
    `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`,
    {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Api-Key": apiKey,
        "X-Tenant": tenant,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    },
  );

  const text = await response.text();

  let data: unknown;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(
      `ZR Express ${response.status}: ${
        typeof data === "string" ? data : JSON.stringify(data)
      }`,
    );
  }

  return data as T;
}
