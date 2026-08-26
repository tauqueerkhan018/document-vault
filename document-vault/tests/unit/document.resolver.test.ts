import { describe, expect, it, mock } from "bun:test";
import type { PrismaClient } from "@prisma/client";
import { documentMutations, documentQueries } from "../../src/resolvers/document.js";
import type { GraphQLContext } from "../../src/context.js";

function makeContext(overrides: Record<string, unknown>): GraphQLContext {
  return { prisma: overrides as unknown as PrismaClient };
}

describe("documentQueries.documents", () => {
  it("builds a case-insensitive OR search on title/content", async () => {
    const findMany = mock(async (..._args:unknown[]) => []);
    const ctx = makeContext({ document: { findMany } });

    await documentQueries.documents({}, { search: "invoice" }, ctx);

    const calledWith = findMany.mock.calls[0]?.[0] as unknown as {
      where: {
        OR: unknown[];
      };
    };
    expect(calledWith.where.OR).toEqual([
      { title: { contains: "invoice", mode: "insensitive" } },
      { content: { contains: "invoice", mode: "insensitive" } },
    ]);
  });

  it("requests take+1 rows and reports nextCursor when more rows exist", async () => {
    const rows = Array.from({ length: 21 }, (_, i) => ({
      id: `d${i}`,
      title: `t${i}`,
      content: "c",
      tags: [],
      isArchived: false,
      createdAt: new Date(),
      collectionId: "c1",
    }));
    const findMany = mock(async () => rows);
    const ctx = makeContext({ document: { findMany } });

    const page = await documentQueries.documents({}, {}, ctx);

    expect(page.items).toHaveLength(20);
    expect(page.nextCursor).toBe("d19");
  });

  it("rejects a non-positive take", async () => {
    const ctx = makeContext({ document: { findMany: mock(async () => []) } });
    expect(documentQueries.documents({}, { take: 0 }, ctx)).rejects.toThrow(/positive integer/);
  });
});

describe("documentMutations.createDocument", () => {
  it("rejects empty title and content", async () => {
    const ctx = makeContext({
      collection: { findUnique: mock(async () => ({ id: "c1" })) },
      document: { create: mock(async () => ({})) },
    });

    expect(
      documentMutations.createDocument(
        {},
        { title: "", content: "body", collectionId: "c1" },
        ctx
      )
    ).rejects.toThrow(/must not be empty/);
  });

  it("throws NOT_FOUND when the collection does not exist", async () => {
    const ctx = makeContext({
      collection: { findUnique: mock(async () => null) },
      document: { create: mock(async () => ({})) },
    });

    expect(
      documentMutations.createDocument(
        {},
        { title: "Title", content: "body", collectionId: "missing" },
        ctx
      )
    ).rejects.toThrow(/was not found/);
  });
});

describe("documentMutations.moveDocument", () => {
  it("moves a document to an existing collection", async () => {
    const update = mock(async () => ({ id: "d1", collectionId: "c2" }));
    const ctx = makeContext({
      document: { findUnique: mock(async () => ({ id: "d1", collectionId: "c1" })), update },
      collection: { findUnique: mock(async () => ({ id: "c2" })) },
    });

    const result = await documentMutations.moveDocument({}, { id: "d1", collectionId: "c2" }, ctx);

    expect(update).toHaveBeenCalledWith({ where: { id: "d1" }, data: { collectionId: "c2" } });
    expect(result.collectionId).toBe("c2");
  });
});
