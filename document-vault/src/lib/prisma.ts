import { PrismaClient } from "@prisma/client";

// Bun's hot-reload in dev can re-execute this module; keep a single
// PrismaClient instance on globalThis so we don't exhaust DB connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
