import { NextRequest } from "next/server";
import { productService } from "@/services/product.service";
import { ok, serverError } from "@/lib/response";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;

    const result = await productService.listProducts({ search, page, limit });
    return ok(result);
  } catch (err) {
    console.error("[GET /api/products]", err);
    return serverError();
  }
}
