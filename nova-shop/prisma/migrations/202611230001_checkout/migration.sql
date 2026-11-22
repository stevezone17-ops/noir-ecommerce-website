ALTER TABLE "Order" ADD COLUMN "shippingEmail" TEXT, ADD COLUMN "checkoutKey" TEXT;
CREATE UNIQUE INDEX "Order_customerId_checkoutKey_key" ON "Order" ("customerId", "checkoutKey");
