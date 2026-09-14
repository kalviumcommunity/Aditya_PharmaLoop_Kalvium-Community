import { withAdminAuth, AuthenticatedRequest } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma";
import { validateBody } from "@/lib/validate";
import { updateProductSchema } from "@/types";
import { ok, notFound, serverError } from "@/lib/response";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withAdminAuth(
  async (_req: AuthenticatedRequest, ctx: unknown) => {
    const { id } = await (ctx as RouteContext).params;
    try {
      const product = await prisma.product.findUnique({
        where: { id },
      });

      if (!product) {
        return notFound("Product not found");
      }

      return ok(product);
    } catch (err) {
      console.error("[GET /api/admin/products/[id]]", err);
      return serverError();
    }
  }
);

export const PATCH = withAdminAuth(
  async (req: AuthenticatedRequest, ctx: unknown) => {
    const { id } = await (ctx as RouteContext).params;
    const { data, error } = await validateBody(req, updateProductSchema);
    if (error) return error;

    try {
      const existing = await prisma.product.findUnique({
        where: { id },
      });

      if (!existing) {
        return notFound("Product not found");
      }

      const updateData: Prisma.ProductUpdateInput = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.price !== undefined) updateData.price = new Prisma.Decimal(data.price);
      if (data.stock !== undefined) updateData.stock = data.stock;
      if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      const updated = await prisma.product.update({
        where: { id },
        data: updateData,
      });

      return ok(updated, "Product updated successfully");
    } catch (err) {
      console.error("[PATCH /api/admin/products/[id]]", err);
      return serverError();
    }
  }
);
