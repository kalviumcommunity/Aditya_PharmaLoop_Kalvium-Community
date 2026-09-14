import { Prisma } from "@/app/generated/prisma";

/**
 * Atomically decrements product stock only when the product is active and
 * has sufficient quantity. Returns true if the decrement succeeded.
 *
 * Uses a single conditional UPDATE so concurrent checkouts cannot drive
 * stock negative under READ COMMITTED.
 */
export async function tryDecrementStock(
  tx: Prisma.TransactionClient,
  productId: string,
  quantity: number,
): Promise<boolean> {
  if (quantity <= 0) return false;

  const affected = await tx.$executeRaw`
    UPDATE "Product"
    SET stock = stock - ${quantity},
        "updatedAt" = NOW()
    WHERE id = ${productId}
      AND "isActive" = true
      AND stock >= ${quantity}
  `;

  return Number(affected) === 1;
}

/**
 * Restores stock for a set of order items. Safe to call inside a transaction
 * after a failed/cancelled refill that previously deducted inventory.
 */
export async function restoreStockForItems(
  tx: Prisma.TransactionClient,
  items: Array<{ productId: string; quantity: number }>,
): Promise<void> {
  for (const item of items) {
    if (item.quantity <= 0) continue;
    await tx.$executeRaw`
      UPDATE "Product"
      SET stock = stock + ${item.quantity},
          "updatedAt" = NOW()
      WHERE id = ${item.productId}
    `;
  }
}
