import { prisma } from "./lib/prisma.js";

export function createContext() {
  return { prisma };
}

export type GraphQLContext = ReturnType<typeof createContext>;
