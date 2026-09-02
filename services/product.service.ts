import { productRepository } from "@/repositories/product.repository";
import { ProductListParams, PaginatedResult } from "@/types";

export const productService = {
  async listProducts(params: ProductListParams): Promise<PaginatedResult<unknown>> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));

    const { items, total } = await productRepository.findAll({
      search: params.search,
      page,
      limit,
      onlyActive: true,
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async getProduct(id: string) {
    const product = await productRepository.findById(id);
    if (!product || !product.isActive) {
      throw new Error("PRODUCT_NOT_FOUND");
    }
    return product;
  },
};
