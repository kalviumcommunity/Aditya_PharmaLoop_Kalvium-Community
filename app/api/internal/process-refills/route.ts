import { withInternalAuth } from "@/lib/middleware";
import { refillService } from "@/services/refill.service";
import { ok, serverError } from "@/lib/response";

export const POST = withInternalAuth(async () => {
  try {
    const summary = await refillService.processDueRefills();
    return ok(summary, `Processed ${summary.processed} refills successfully, ${summary.failed} failed`);
  } catch (err) {
    console.error("[POST /api/internal/process-refills]", err);
    return serverError();
  }
});
