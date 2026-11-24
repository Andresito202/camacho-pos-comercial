import { Inject, Injectable } from "@nestjs/common";
import type { PrismaClient } from "@camacho-pos-comercial/database";
import type { ConsentRecordSchema } from "@camacho-pos-comercial/contracts";
import type { z } from "zod";
import { PRISMA } from "../../common/prisma.tokens.js";

type ConsentInput = z.infer<typeof ConsentRecordSchema>;

@Injectable()
export class ConsentService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  record(input: ConsentInput) {
    return this.prisma.consentRecord.create({
      data: {
        type: input.type,
        granted: input.granted,
        version: input.version,
        sessionId: input.sessionId,
      },
    });
  }
}
