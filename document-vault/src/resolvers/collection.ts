import type { Collection } from "@prisma/client";
import type { GraphQLContext } from "../context.js";
import { assertNonEmpty, assertValidSlug } from "../lib/validation.js";
import { notFound } from "../lib/errors.js";

export const collectionQueries = {
  collections: (
    _parent: unknown,
    _args: Record<string, never>,
    { prisma }: GraphQLContext
  ): Promise<Collection[]> => {
    return prisma.collection.findMany({ orderBy: { createdAt: "desc" } });
  },

  collection: (
    _parent: unknown,
    args: { id: string },
    { prisma }: GraphQLContext
  ): Promise<Collection | null> => {
    return prisma.collection.findUnique({ where: { id: args.id } });
  },
};

export const collectionMutations = {
  createCollection: (
    _parent: unknown,
    args: { name: string; slug: string },
    { prisma }: GraphQLContext
  ): Promise<Collection> => {
    assertNonEmpty(args.name, "name");
    assertValidSlug(args.slug);

    return prisma.collection.create({
      data: { name: args.name.trim(), slug: args.slug },
    });
  },
};

export const collectionFieldResolvers = {
  Collection: {
    documents: (parent: Collection, _args: Record<string, never>, { prisma }: GraphQLContext) => {
      return prisma.document.findMany({
        where: { collectionId: parent.id },
        orderBy: { createdAt: "desc" },
      });
    },
  },
};

/** Fetches a collection or throws a GraphQL NOT_FOUND error. */
export async function requireCollection(
  prisma: GraphQLContext["prisma"],
  id: string
): Promise<Collection> {
  const collection = await prisma.collection.findUnique({ where: { id } });
  if (!collection) {
    throw notFound("Collection", id);
  }
  return collection;
}
