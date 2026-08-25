import { GraphQLScalarType, Kind } from "graphql";
import {
  collectionQueries,
  collectionMutations,
  collectionFieldResolvers,
} from "./collection.js";
import {
  documentQueries,
  documentMutations,
  documentFieldResolvers,
} from "./document.js";

const DateTimeScalar = new GraphQLScalarType({
  name: "DateTime",
  description: "ISO-8601 date-time string",
  serialize(value) {
    if (value instanceof Date) return value.toISOString();
    throw new Error("DateTime can only serialize Date values");
  },
  parseValue(value) {
    if (typeof value !== "string") {
      throw new Error("DateTime must be an ISO-8601 string");
    }
    return new Date(value);
  },
  parseLiteral(ast) {
    if (ast.kind !== Kind.STRING) {
      throw new Error("DateTime must be a string literal");
    }
    return new Date(ast.value);
  },
});

export const resolvers = {
  DateTime: DateTimeScalar,
  Query: {
    ...collectionQueries,
    ...documentQueries,
  },
  Mutation: {
    ...collectionMutations,
    ...documentMutations,
  },
  ...collectionFieldResolvers,
  ...documentFieldResolvers,
};
