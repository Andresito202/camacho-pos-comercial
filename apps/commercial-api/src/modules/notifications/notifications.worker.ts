import { Inject, Injectable, Logger } from "@nestjs/common";
import type { PrismaClient } from "@camacho-pos-comercial/database";
import { PRISMA } from "../../common/prisma.tokens.js";

/**
 * Notification outbox worker stub.
 * Claims PENDING rows, marks SENT/FAILED; does not send real PII over WhatsApp URLs.
 */
@Injectable()
export class NotificationsOutboxWorker {
  private readonly logger = new Logger(NotificationsOutboxWorker.name);

  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async enqueue(input: {
    channel: "EMAIL" | "WHATSAPP" | "WEBHOOK" | "INTERNAL";
    recipient: string;
    template: string;
    payload: object;
  }) {
    return this.prisma.notificationOutbox.create({
      data: {
        channel: input.channel,
        recipient: input.recipient,
        template: input.template,
        payload: input.payload,
        status: "PENDING",
        nextRetryAt: new Date(),
      },
    });
  }

  async processDue(limit = 50) {
    const due = await this.prisma.notificationOutbox.findMany({
      where: {
        status: { in: ["PENDING", "FAILED"] },
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }],
      },
      take: limit,
      orderBy: { createdAt: "asc" },
    });

    const results: Array<{ id: string; status: string }> = [];
    for (const row of due) {
      await this.prisma.notificationOutbox.update({
        where: { id: row.id },
        data: { status: "PROCESSING" },
      });
      try {
        // Stub delivery — real providers require credentials.
        this.logger.log(`STUB deliver ${row.channel} template=${row.template} to=${row.recipient}`);
        await this.prisma.notificationOutbox.update({
          where: { id: row.id },
          data: {
            status: "SENT",
            sentAt: new Date(),
            attemptCount: row.attemptCount + 1,
            lastError: null,
          },
        });
        results.push({ id: row.id, status: "SENT" });
      } catch (error) {
        const message = error instanceof Error ? error.message : "UNKNOWN";
        const dead = row.attemptCount + 1 >= 8;
        await this.prisma.notificationOutbox.update({
          where: { id: row.id },
          data: {
            status: dead ? "DEAD" : "FAILED",
            lastError: message,
            attemptCount: row.attemptCount + 1,
            nextRetryAt: new Date(Date.now() + 60_000 * (row.attemptCount + 1)),
          },
        });
        results.push({ id: row.id, status: dead ? "DEAD" : "FAILED" });
      }
    }
    return results;
  }
}
