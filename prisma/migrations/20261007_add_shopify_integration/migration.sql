-- CreateTable
CREATE TABLE "ShopifyConnection" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "scopes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopifyConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalOrder" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'shopify',
    "externalId" TEXT NOT NULL,
    "externalNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopifyConnection_merchantId_shopDomain_key"
ON "ShopifyConnection"("merchantId", "shopDomain");

CREATE INDEX "ShopifyConnection_merchantId_idx"
ON "ShopifyConnection"("merchantId");

CREATE INDEX "ShopifyConnection_shopDomain_idx"
ON "ShopifyConnection"("shopDomain");

CREATE UNIQUE INDEX "ExternalOrder_connectionId_platform_externalId_key"
ON "ExternalOrder"("connectionId", "platform", "externalId");

CREATE UNIQUE INDEX "ExternalOrder_orderId_platform_key"
ON "ExternalOrder"("orderId", "platform");

CREATE INDEX "ExternalOrder_merchantId_idx"
ON "ExternalOrder"("merchantId");

CREATE INDEX "ExternalOrder_externalId_idx"
ON "ExternalOrder"("externalId");

-- AddForeignKey
ALTER TABLE "ShopifyConnection"
ADD CONSTRAINT "ShopifyConnection_merchantId_fkey"
FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExternalOrder"
ADD CONSTRAINT "ExternalOrder_merchantId_fkey"
FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExternalOrder"
ADD CONSTRAINT "ExternalOrder_connectionId_fkey"
FOREIGN KEY ("connectionId") REFERENCES "ShopifyConnection"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExternalOrder"
ADD CONSTRAINT "ExternalOrder_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
