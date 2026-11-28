import { BadRequestException } from "@nestjs/common";
import { ZodError } from "zod";

/** Map contract validation / client-totals rejection to HTTP 400 fail-closed responses. */
export function parseOrBadRequest<T>(fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    if (error instanceof Error && error.message === "CLIENT_TOTALS_REJECTED") {
      throw new BadRequestException({
        code: "CLIENT_TOTALS_REJECTED",
        message: "Client-supplied totals are rejected; server is price authority.",
      });
    }
    if (error instanceof ZodError) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        issues: error.issues,
      });
    }
    throw error;
  }
}
