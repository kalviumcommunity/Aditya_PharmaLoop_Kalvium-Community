import { withAdminAuth, AuthenticatedRequest } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma";
import { validateBody } from "@/lib/validate";
import { createProductSchema } from "@/types";
import { ok, serverError } from "@/lib/response";

export const GET = withAdminAuth(async (req: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const searchParam = searchParams.get("search");
    const statusParam = searchParams.get("status"); // ALL | ACTIVE | INACTIVE
    const lowStockParam = searchParams.get("lowStock"); // true | false (reporting threshold <= 20)

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};

    if (statusParam === "ACTIVE") {
      where.isActive = true;
    } else if (statusParam === "INACTIVE") {
      where.isActive = false;
    }

    if (lowStockParam === "true") {
      where.stock = { lte: 20 };
    }

    if (searchParam && searchParam.trim().length > 0) {
      const q = searchParam.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    const [totalCount, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return ok({
      items: products,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
    });
  } catch (err) {
    console.error("[GET /api/admin/products]", err);
    return serverError();
  }
});

export const POST = withAdminAuth(async (req: AuthenticatedRequest) => {
  const { data, error } = await validateBody(req, createProductSchema);
  if (error) return error;

  try {
    const product = await prisma.product.create({
      data: {
        name: data.name,
        description: data.description || null,
        price: new Prisma.Decimal(data.price),
        stock: data.stock,
        imageUrl: data.imageUrl || null,
        isActive: data.isActive,
      },
    });

    return ok(product, "Product created successfully");
  } catch (err) {
    console.error("[POST /api/admin/products]", err);
    return serverError();
  }
});
