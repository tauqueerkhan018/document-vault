import { describe, expect, it, mock } from "bun:test";
import { GraphQLError } from "graphql";
import type { PrismaClient } from "@prisma/client";
import { collectionMutations, collectionQueries } from "../../src/resolvers/collection.js";
import type { GraphQLContext } from "../../src/context.js";

function makeContext(overrides: Record<string, unknown>): GraphQLContext {
  return { prisma: overrides as unknown as PrismaClient };
}

describe("collectionQueries.collections", () => {
  it("returns collections ordered by createdAt desc", async () => {
    const findMany = mock(async () => [{ id: "c1", name: "Notes", slug: "notes", createdAt: new Date() }]);
    const ctx = makeContext({ collection: { findMany } });

    const result = await collectionQueries.collections({}, {}, ctx);

    expect(findMany).toHaveBeenCalledWith({ orderBy: { createdAt: "desc" } });
    expect(result).toHaveLength(1);
  });
});

describe("collectionMutations.createCollection", () => {
 it("rejects an empty name", async () => {
  expect.assertions(2);

  const ctx = makeContext({
    collection: {
      create: mock(async () => ({})),
    },
  });

  try {
    await collectionMutations.createCollection(
      {},
      { name: "", slug: "notes" },
      ctx
    );

    throw new Error("expected rejection");
  } catch (err) {
    expect(err).toBeInstanceOf(GraphQLError);
    expect((err as GraphQLError).extensions?.code).toBe(
      "BAD_USER_INPUT"
    );
  }
});


it("rejects a malformed slug", async () => {
  expect.assertions(2);

  const ctx = makeContext({
    collection: {
      create: mock(async () => ({})),
    },
  });

  try {
    await collectionMutations.createCollection(
      {},
      { name: "Notes", slug: "Not A Slug!" },
      ctx
    );

    throw new Error("expected rejection");
  } catch (err) {
    expect(err).toBeInstanceOf(GraphQLError);
    expect((err as GraphQLError).extensions?.code).toBe(
      "BAD_USER_INPUT"
    );
  }
});
 
  it("creates a collection with a trimmed name and valid slug", async () => {
    const create = mock(async (args: unknown) => ({ id: "c1", ...((args as { data: object }).data) }));
    const ctx = makeContext({ collection: { create } });

    const result = await collectionMutations.createCollection(
      {},
      { name: "  Engineering Notes  ", slug: "engineering-notes" },
      ctx
    );

    expect(create).toHaveBeenCalledWith({
      data: { name: "Engineering Notes", slug: "engineering-notes" },
    });
    expect(result.slug).toBe("engineering-notes");
  });
});
