import { NextRequest } from "next/server";
import { productService } from "@/services/product.service";
import { ok, notFound, serverError } from "@/lib/response";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const product = await productService.getProduct(id);
    return ok(product);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "PRODUCT_NOT_FOUND") {
      return notFound("Product not found");
    }
    console.error("[GET /api/products/[id]]", err);
    return serverError();
  }
}
