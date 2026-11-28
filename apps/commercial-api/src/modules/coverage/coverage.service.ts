import { Inject, Injectable } from "@nestjs/common";
import type { PrismaClient } from "@camacho-pos-comercial/database";
import { PRISMA } from "../../common/prisma.tokens.js";

@Injectable()
export class CoverageService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  listDepartments() {
    return this.prisma.department.findMany({
      include: { cities: { orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    });
  }

  listZones(opts?: { includeDraft?: boolean }) {
    const includeDraft = opts?.includeDraft === true;
    return this.prisma.coverageZone.findMany({
      where: includeDraft ? undefined : { publicationStatus: "PUBLISHED" },
      include: {
        rates: includeDraft
          ? true
          : { where: { publicationStatus: "PUBLISHED" } },
        city: true,
      },
    });
  }
}
