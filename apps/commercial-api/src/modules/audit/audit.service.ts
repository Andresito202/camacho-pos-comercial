import { Inject, Injectable } from "@nestjs/common";
import type { PrismaClient, AuditActorType, Prisma } from "@camacho-pos-comercial/database";
import { PRISMA } from "../../common/prisma.tokens.js";

@Injectable()
export class AuditService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async record(input: {
    actorType: AuditActorType;
    actorId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: Prisma.InputJsonValue;
    ipHash?: string | null;
  }, writer: Pick<PrismaClient, "auditLog"> = this.prisma): Promise<void> {
    await writer.auditLog.create({
      data: {
        actorType: input.actorType,
        actorId: input.actorId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        metadata: input.metadata ?? undefined,
        ipHash: input.ipHash ?? null,
      },
    });
  }
}
