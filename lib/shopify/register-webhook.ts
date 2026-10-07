import { shopifyGraphQL } from "@/lib/shopify/client";

const CREATE_WEBHOOK_MUTATION = `
  mutation WebhookSubscriptionCreate(
    $topic: WebhookSubscriptionTopic!
    $webhookSubscription: WebhookSubscriptionInput!
  ) {
    webhookSubscriptionCreate(
      topic: $topic
      webhookSubscription: $webhookSubscription
    ) {
      webhookSubscription {
        id
        topic
        uri
      }
      userErrors {
        field
        message
      }
    }
  }
`;

type WebhookSubscriptionCreateResponse = {
  webhookSubscriptionCreate: {
    webhookSubscription: {
      id: string;
      topic: string;
      uri: string;
    } | null;
    userErrors: Array<{
      field: string[] | null;
      message: string;
    }>;
  };
};

export async function registerShopifyOrdersCreateWebhook(
  shopDomain: string,
  accessToken: string,
) {
  const appUrl = process.env.SHOPIFY_APP_URL;

  if (!appUrl) {
    throw new Error("SHOPIFY_APP_URL is not configured");
  }

  const webhookUrl = `${appUrl.replace(
    /\/+$/,
    "",
  )}/api/shopify/webhooks/orders-create`;

  const result =
    await shopifyGraphQL<WebhookSubscriptionCreateResponse>(
      shopDomain,
      accessToken,
      CREATE_WEBHOOK_MUTATION,
      {
        topic: "ORDERS_CREATE",
        webhookSubscription: {
          uri: webhookUrl,
        },
      },
    );

  const errors =
    result.webhookSubscriptionCreate.userErrors;

  if (errors.length > 0) {
    throw new Error(
      errors.map((error) => error.message).join("; "),
    );
  }

  const webhook =
    result.webhookSubscriptionCreate.webhookSubscription;

  if (!webhook) {
    throw new Error(
      "Shopify did not return the created webhook",
    );
  }

  return webhook;
}
