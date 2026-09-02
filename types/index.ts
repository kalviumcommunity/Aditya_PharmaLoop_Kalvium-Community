import { z } from "zod";

// ─── Auth ───────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

// ─── Products ────────────────────────────────────────────────────────────────

export interface ProductListParams {
  search?: string;
  page?: number;
  limit?: number;
}

// ─── Cart ────────────────────────────────────────────────────────────────────

export const addCartItemSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  quantity: z.number().int().positive().default(1),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().positive("Quantity must be a positive integer"),
});

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;

// ─── Subscriptions ───────────────────────────────────────────────────────────

export const createSubscriptionSchema = z.object({
  addressId: z.string().min(1, "Delivery address is required"),
  frequency: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY"]),
  nextRefillDate: z.string().datetime({ message: "nextRefillDate must be an ISO 8601 date-time" }),
  refillTime: z.string().regex(/^\d{2}:\d{2}$/, "refillTime must be HH:MM"),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive(),
      })
    )
    .min(1, "At least one item is required"),
});

export const patchSubscriptionSchema = z
  .object({
    action: z.enum(["pause", "resume", "cancel", "skip"]).optional(),
    addressId: z.string().min(1, "Address ID cannot be empty").optional(),
  })
  .refine((data) => data.action !== undefined || data.addressId !== undefined, {
    message: "At least one of 'action' or 'addressId' must be provided",
  });

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type PatchSubscriptionInput = z.infer<typeof patchSubscriptionSchema>;

// ─── Orders ──────────────────────────────────────────────────────────────────

export const createOrderSchema = z.object({
  addressId: z.string().min(1, "Delivery address is required"),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

// ─── Addresses ───────────────────────────────────────────────────────────────

export const addressSchema = z.object({
  label: z.string().optional(),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  country: z.string().default("India"),
});

export type AddressInput = z.infer<typeof addressSchema>;

// ─── Shared ──────────────────────────────────────────────────────────────────

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
