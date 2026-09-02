import { z, ZodSchema } from "zod";
import { badRequest } from "./response";

/**
 * Parse and validate a JSON request body against a Zod schema.
 * Returns `{ data, error }` — `error` is a Response to return immediately
 * when validation fails, `data` is the typed, parsed value on success.
 */
export async function validateBody<T>(
  req: Request,
  schema: ZodSchema<T>
): Promise<{ data: T; error: null } | { data: null; error: Response }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { data: null, error: badRequest("Request body must be valid JSON") };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const messages = result.error.issues
      .map((e: z.ZodIssue) => `${e.path.join(".")}: ${e.message}`)
      .join(", ");
    return { data: null, error: badRequest(messages) };
  }

  return { data: result.data, error: null };
}

/**
 * Common reusable Zod schemas.
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type PaginationParams = z.infer<typeof paginationSchema>;
