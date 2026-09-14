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

export const verifyEmailSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z
    .string()
    .regex(/^\d{6}$/, "Verification code must be exactly 6 digits"),
});

export const resendOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const verifyPasswordResetOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z
    .string()
    .regex(/^\d{6}$/, "Verification code must be exactly 6 digits"),
});

export const resetPasswordSchema = z
  .object({
    resetToken: z.string().min(1, "Reset token is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendOtpInput = z.infer<typeof resendOtpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type VerifyPasswordResetOtpInput = z.infer<
  typeof verifyPasswordResetOtpSchema
>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ─── Products ────────────────────────────────────────────────────────────────

export interface ProductListParams {
  search?: string;
  page?: number;
  limit?: number;
}

export const createProductSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters"),
  description: z.string().optional(),
  price: z.number().positive("Price must be greater than zero"),
  stock: z.number().int().min(0, "Stock cannot be negative").default(0),
  imageUrl: z.string().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export const updateProductSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().nullable().optional(),
  price: z.number().positive().optional(),
  stock: z.number().int().min(0).optional(),
  imageUrl: z.string().nullable().optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

// ─── Cart ────────────────────────────────────────────────────────────────────

export const addCartItemSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  quantity: z
    .number()
    .int()
    .positive()
    .max(999, "Quantity cannot exceed 999")
    .default(1),
});

export const updateCartItemSchema = z.object({
  quantity: z
    .number()
    .int()
    .positive("Quantity must be a positive integer")
    .max(999, "Quantity cannot exceed 999"),
});

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;

// ─── Subscriptions ───────────────────────────────────────────────────────────

export const createSubscriptionSchema = z.object({
  addressId: z.string().min(1, "Delivery address is required"),
  frequency: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY"]),
  nextRefillDate: z
    .string()
    .datetime({ message: "nextRefillDate must be an ISO 8601 date-time" }),
  refillTime: z.string().regex(/^\d{2}:\d{2}$/, "refillTime must be HH:MM"),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive().max(999),
      }),
    )
    .min(1, "At least one item is required"),
  clearCart: z.boolean().optional(),
});

export const patchSubscriptionSchema = z
  .object({
    action: z.enum(["pause", "resume", "cancel", "skip"]).optional(),
    addressId: z.string().min(1, "Address ID cannot be empty").optional(),
    frequency: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY"]).optional(),
    nextRefillDate: z
      .string()
      .datetime({ message: "nextRefillDate must be an ISO 8601 date-time" })
      .optional(),
    refillTime: z
      .string()
      .regex(
        /^(?:[01]\d|2[0-3]):[0-5]\d$/,
        "refillTime must be HH:MM (00:00 to 23:59)",
      )
      .optional(),
  })
  .refine(
    (data) =>
      data.action !== undefined ||
      data.addressId !== undefined ||
      data.frequency !== undefined ||
      data.nextRefillDate !== undefined ||
      data.refillTime !== undefined,
    {
      message: "At least one field to update must be provided",
    },
  );

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type PatchSubscriptionInput = z.infer<typeof patchSubscriptionSchema>;

// ─── Orders ──────────────────────────────────────────────────────────────────

export const createOrderSchema = z.object({
  addressId: z.string().min(1, "Delivery address is required"),
  paymentMethod: z.enum(["ONLINE", "COD"]).default("ONLINE"),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
  ]),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

// ─── Feedback ────────────────────────────────────────────────────────────────

export const submitFeedbackSchema = z.object({
  rating: z
    .number({ error: "Rating must be a number" })
    .int("Rating must be an integer")
    .min(1, "Rating must be at least 1")
    .max(5, "Rating must be at most 5"),
  comment: z
    .string()
    .max(500, "Comment must not exceed 500 characters")
    .optional()
    .nullable(),
});

export type SubmitFeedbackInput = z.infer<typeof submitFeedbackSchema>;

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
