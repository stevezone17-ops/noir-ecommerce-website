CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT','PAID','PROCESSING','SHIPPED','DELIVERED','CANCELLED','REFUNDED');
CREATE TABLE "Order" (
 "id" TEXT NOT NULL PRIMARY KEY, "customerId" TEXT NOT NULL, "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
 "currency" TEXT NOT NULL DEFAULT 'INR', "subtotalPaise" INTEGER NOT NULL, "shippingPaise" INTEGER NOT NULL DEFAULT 0,
 "totalPaise" INTEGER NOT NULL, "shippingName" TEXT NOT NULL, "shippingPhone" TEXT NOT NULL,
 "addressLine1" TEXT NOT NULL, "addressLine2" TEXT, "city" TEXT NOT NULL, "state" TEXT NOT NULL,
 "postalCode" TEXT NOT NULL, "country" TEXT NOT NULL DEFAULT 'IN',
 "razorpayOrderId" TEXT, "razorpayPaymentId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "OrderItem" (
 "id" TEXT NOT NULL PRIMARY KEY, "orderId" TEXT NOT NULL, "productId" TEXT NOT NULL, "title" TEXT NOT NULL,
 "quantity" INTEGER NOT NULL, "unitPricePaise" INTEGER NOT NULL, "lineTotalPaise" INTEGER NOT NULL,
 CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "PaymentEvent" (
 "id" TEXT NOT NULL PRIMARY KEY, "providerEventId" TEXT NOT NULL, "orderId" TEXT, "eventType" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "PaymentEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Order_razorpayOrderId_key" ON "Order"("razorpayOrderId");
CREATE UNIQUE INDEX "Order_razorpayPaymentId_key" ON "Order"("razorpayPaymentId");
CREATE INDEX "Order_customerId_createdAt_idx" ON "Order"("customerId","createdAt");
CREATE UNIQUE INDEX "PaymentEvent_providerEventId_key" ON "PaymentEvent"("providerEventId");
