/**
 * Integration test that exercises real resolvers against the Dockerized
 * PostgreSQL instance (via Prisma) rather than a mock.
 *
 * Requires: `docker compose up -d` and `bun run gendb` to have been run
 * first, with DATABASE_URL pointing at that database (see .env.example).
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { prisma } from "../../src/lib/prisma.js";
import { collectionMutations } from "../../src/resolvers/collection.js";
import { documentMutations, documentQueries } from "../../src/resolvers/document.js";
import type { GraphQLContext } from "../../src/context.js";

const ctx: GraphQLContext = { prisma };

// Unique slug per run so repeated test runs don't collide on the
// slug's unique constraint.
const slug = `integration-test-${Date.now()}`;

describe("Document Vault integration", () => {
  afterAll(async () => {
    await prisma.collection.deleteMany({ where: { slug } });
    await prisma.$disconnect();
  });

  it("creates a collection, adds documents, searches, paginates, and moves a document", async () => {
    const collectionA = await collectionMutations.createCollection(
      {},
      { name: "Integration A", slug },
      ctx
    );

    const collectionB = await collectionMutations.createCollection(
      {},
      { name: "Integration B", slug: `${slug}-b` },
      ctx
    );

    await documentMutations.createDocument(
      {},
      { title: "Quarterly invoice", content: "Payment due", collectionId: collectionA.id },
      ctx
    );
    await documentMutations.createDocument(
      {},
      { title: "Meeting notes", content: "Discussed the invoice timeline", collectionId: collectionA.id },
      ctx
    );
    const third = await documentMutations.createDocument(
      {},
      { title: "Unrelated", content: "Nothing here", collectionId: collectionA.id },
      ctx
    );

    const searchResults = await documentQueries.documents(
      {},
      { collectionId: collectionA.id, search: "invoice" },
      ctx
    );
    expect(searchResults.items).toHaveLength(2);

    const moved = await documentMutations.moveDocument(
      {},
      { id: third.id, collectionId: collectionB.id },
      ctx
    );
    expect(moved.collectionId).toBe(collectionB.id);

    const page = await documentQueries.documents({}, { collectionId: collectionA.id, take: 1 }, ctx);
    expect(page.items).toHaveLength(1);
    expect(page.nextCursor).not.toBeNull();

    await prisma.collection.delete({ where: { id: collectionB.id } });
  });

  it("rejects an empty title with a GraphQL BAD_USER_INPUT error", async () => {
    const collection = await collectionMutations.createCollection(
      {},
      { name: "Validation", slug: `${slug}-validation` },
      ctx
    );

    await expect(
      documentMutations.createDocument(
        {},
        { title: "  ", content: "body", collectionId: collection.id },
        ctx
      )
    ).rejects.toThrow(/must not be empty/);

    await prisma.collection.delete({ where: { id: collection.id } });
  });
});
