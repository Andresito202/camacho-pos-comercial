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
}
