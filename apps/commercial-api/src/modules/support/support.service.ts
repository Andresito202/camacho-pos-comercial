import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { PrismaClient } from "@camacho-pos-comercial/database";
import type { CreateSupportTicketSchema } from "@camacho-pos-comercial/contracts";
import type { z } from "zod";
import { PRISMA } from "../../common/prisma.tokens.js";

type CreateTicket = z.infer<typeof CreateSupportTicketSchema>;

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

@Injectable()
export class SupportService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async createTicket(input: CreateTicket) {
    const accessToken = randomBytes(32).toString("hex");
    const ticket = await this.prisma.supportTicket.create({
      data: {
        email: input.email.toLowerCase(),
        subject: input.subject,
        priority: input.priority,
        status: "OPEN",
        accessTokenHash: sha256(accessToken),
        messages: {
          create: {
            body: input.body,
            actorType: "CUSTOMER",
          },
        },
      },
      include: { messages: true },
    });
    return {
      id: ticket.id,
      status: ticket.status,
      accessToken,
      subject: ticket.subject,
      createdAt: ticket.createdAt,
    };
  }

  /**
   * Public read — requires access token. Wrong/missing → identical 404 (anti-IDOR).
   */
  async getTicket(id: string, accessToken: string | undefined) {
    if (!accessToken || accessToken.length < 16) {
      throw new NotFoundException({ code: "TICKET_NOT_FOUND" });
    }
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!ticket || ticket.deletedAt) throw new NotFoundException({ code: "TICKET_NOT_FOUND" });

    const expected = Buffer.from(ticket.accessTokenHash, "hex");
    const actual = Buffer.from(sha256(accessToken), "hex");
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      throw new NotFoundException({ code: "TICKET_NOT_FOUND" });
    }

    return {
      id: ticket.id,
      status: ticket.status,
      priority: ticket.priority,
      subject: ticket.subject,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      closedAt: ticket.closedAt,
      // email omitted from public GET — reduces PII exposure even with token
      messages: ticket.messages.map((m) => ({
        id: m.id,
        body: m.body,
        actorType: m.actorType,
        createdAt: m.createdAt,
      })),
    };
  }

  listTicketsAdmin() {
    return this.prisma.supportTicket.findMany({
      where: { deletedAt: null },
      include: {
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
        customer: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async replyTicket(id: string, input: { body: string; adminId: string; status?: "OPEN" | "IN_PROGRESS" | "WAITING_CUSTOMER" | "RESOLVED" | "CLOSED" }) {
    const ticket = await this.prisma.supportTicket.findFirst({ where: { id, deletedAt: null } });
    if (!ticket) throw new NotFoundException({ code: "TICKET_NOT_FOUND" });
    return this.prisma.supportTicket.update({
      where: { id },
      data: {
        status: input.status ?? "IN_PROGRESS",
        ...(input.status === "CLOSED" || input.status === "RESOLVED"
          ? { closedAt: new Date() }
          : {}),
        messages: {
          create: {
            body: input.body,
            actorType: "ADMIN",
            actorId: input.adminId,
          },
        },
      },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
  }
}
