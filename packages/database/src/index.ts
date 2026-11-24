export { PrismaClient, Prisma } from "@prisma/client";
export type * from "@prisma/client";

import { PrismaClient } from "@prisma/client";

let singleton: PrismaClient | undefined;

/** Shared Prisma client for Nest and scripts. Soft-delete filters stay in services. */
export function createPrismaClient(databaseUrl?: string): PrismaClient {
  return new PrismaClient({
    ...(databaseUrl ? { datasourceUrl: databaseUrl } : {}),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export function getPrismaClient(): PrismaClient {
  if (!singleton) {
    singleton = createPrismaClient();
  }
  return singleton;
}
