type ShopifyGraphQLResponse<T> = {
  data?: T;
  errors?: Array<{
    message?: string;
  }>;
};

function getShopifyApiVersion() {
  return process.env.SHOPIFY_API_VERSION || "2026-04";
}

export async function shopifyGraphQL<T>(
  shopDomain: string,
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const normalizedDomain = shopDomain
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");

  if (!normalizedDomain) {
    throw new Error("Shopify shop domain is required");
  }

  if (!accessToken) {
    throw new Error("Shopify access token is required");
  }

  const url = `https://${normalizedDomain}/admin/api/${getShopifyApiVersion()}/graphql.json`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
    cache: "no-store",
  });

  const body =
    (await response.json()) as ShopifyGraphQLResponse<T>;

  if (!response.ok) {
    throw new Error(
      body.errors?.[0]?.message ||
        `Shopify API request failed with status ${response.status}`,
    );
  }

  if (body.errors?.length) {
    throw new Error(
      body.errors[0]?.message ||
        "Shopify GraphQL request failed",
    );
  }

  if (!body.data) {
    throw new Error("Shopify GraphQL response did not contain data");
  }

  return body.data;
}
