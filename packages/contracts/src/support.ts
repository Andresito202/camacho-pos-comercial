import { z } from "zod";

export const CreateSupportTicketSchema = z
  .object({
    email: z.string().email(),
    subject: z.string().min(3).max(200),
    body: z.string().min(5).max(8000),
    priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  })
  .strict();

export const ConsentRecordSchema = z
  .object({
    type: z.enum(["COOKIES", "MARKETING", "PRIVACY", "TERMS"]),
    granted: z.boolean(),
    version: z.string().min(1).max(40),
    sessionId: z.string().min(8).max(128).optional(),
  })
  .strict();
