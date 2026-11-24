import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { PrismaClient } from "@camacho-pos-comercial/database";
import type { CreateSupportTicketSchema } from "@camacho-pos-comercial/contracts";
import type { z } from "zod";
import { PRISMA } from "../../common/prisma.tokens.js";

type CreateTicket = z.infer<typeof CreateSupportTicketSchema>;

@Injectable()
export class SupportService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async createTicket(input: CreateTicket) {
    const ticket = await this.prisma.supportTicket.create({
      data: {
        email: input.email.toLowerCase(),
        subject: input.subject,
        priority: input.priority,
        status: "OPEN",
        messages: {
          create: {
            body: input.body,
            actorType: "CUSTOMER",
          },
        },
      },
      include: { messages: true },
    });
    return ticket;
  }

  async getTicket(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!ticket || ticket.deletedAt) throw new NotFoundException({ code: "TICKET_NOT_FOUND" });
    return ticket;
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
