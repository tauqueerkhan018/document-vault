import type { Document, Prisma } from "@prisma/client";
import type { GraphQLContext } from "../context.js";
import {
  assertNonEmpty,
  normalizeTake,
  normalizeTags,
} from "../lib/validation.js";
import { notFound } from "../lib/errors.js";
import { requireCollection } from "./collection.js";

interface DocumentsArgs {
  collectionId?: string | null;
  search?: string | null;
  isArchived?: boolean | null;
  take?: number | null;
  cursor?: string | null;
}

interface DocumentPage {
  items: Document[];
  nextCursor: string | null;
}

export const documentQueries = {
  documents: async (
    _parent: unknown,
    args: DocumentsArgs,
    { prisma }: GraphQLContext
  ): Promise<DocumentPage> => {
    const take = normalizeTake(args.take);

    const where: Prisma.DocumentWhereInput = {};
    if (args.collectionId) {
      where.collectionId = args.collectionId;
    }
    if (typeof args.isArchived === "boolean") {
      where.isArchived = args.isArchived;
    }
    if (args.search && args.search.trim().length > 0) {
      const term = args.search.trim();
      where.OR = [
        { title: { contains: term, mode: "insensitive" } },
        { content: { contains: term, mode: "insensitive" } },
      ];
    }

    // Fetch one extra row so we know whether a next page exists, without
    // a separate count query.
    const rows = await prisma.document.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: take + 1,
      ...(args.cursor
        ? { cursor: { id: args.cursor }, skip: 1 }
        : {}),
    });

    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;

    return { items, nextCursor };
  },
};

export const documentMutations = {
  createDocument: async (
    _parent: unknown,
    args: {
      title: string;
      content: string;
      collectionId: string;
      tags?: string[] | null;
    },
    { prisma }: GraphQLContext
  ): Promise<Document> => {
    assertNonEmpty(args.title, "title");
    assertNonEmpty(args.content, "content");
    await requireCollection(prisma, args.collectionId);

    return prisma.document.create({
      data: {
        title: args.title.trim(),
        content: args.content,
        collectionId: args.collectionId,
        tags: normalizeTags(args.tags),
      },
    });
  },

  updateDocument: async (
    _parent: unknown,
    args: {
      id: string;
      title?: string | null;
      content?: string | null;
      tags?: string[] | null;
      isArchived?: boolean | null;
    },
    { prisma }: GraphQLContext
  ): Promise<Document> => {
    await requireDocument(prisma, args.id);

    if (args.title !== undefined && args.title !== null) {
      assertNonEmpty(args.title, "title");
    }
    if (args.content !== undefined && args.content !== null) {
      assertNonEmpty(args.content, "content");
    }

    const data: Prisma.DocumentUpdateInput = {};
    if (args.title !== undefined && args.title !== null) {
      data.title = args.title.trim();
    }
    if (args.content !== undefined && args.content !== null) {
      data.content = args.content;
    }
    if (args.tags !== undefined && args.tags !== null) {
      data.tags = { set: normalizeTags(args.tags) };
    }
    if (args.isArchived !== undefined && args.isArchived !== null) {
      data.isArchived = args.isArchived;
    }

    return prisma.document.update({ where: { id: args.id }, data });
  },

  deleteDocument: async (
    _parent: unknown,
    args: { id: string },
    { prisma }: GraphQLContext
  ): Promise<boolean> => {
    await requireDocument(prisma, args.id);
    await prisma.document.delete({ where: { id: args.id } });
    return true;
  },

  moveDocument: async (
    _parent: unknown,
    args: { id: string; collectionId: string },
    { prisma }: GraphQLContext
  ): Promise<Document> => {
    await requireDocument(prisma, args.id);
    await requireCollection(prisma, args.collectionId);

    return prisma.document.update({
      where: { id: args.id },
      data: { collectionId: args.collectionId },
    });
  },
};

export const documentFieldResolvers = {
  Document: {
    collection: (parent: Document, _args: Record<string, never>, { prisma }: GraphQLContext) => {
      return prisma.collection.findUniqueOrThrow({
        where: { id: parent.collectionId },
      });
    },
  },
};

async function requireDocument(
  prisma: GraphQLContext["prisma"],
  id: string
): Promise<Document> {
  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) {
    throw notFound("Document", id);
  }
  return document;
}
