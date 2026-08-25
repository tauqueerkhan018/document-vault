import { GraphQLError } from "graphql";

/**
 * Thrown for client-supplied data that fails validation (empty title,
 * malformed slug, etc). Surfaces as a GraphQL error with a BAD_USER_INPUT
 * code instead of an unhandled 500.
 */
export function badUserInput(message: string): GraphQLError {
  return new GraphQLError(message, {
    extensions: { code: "BAD_USER_INPUT" },
  });
}

/**
 * Thrown when a referenced entity (collection, document) does not exist.
 */
export function notFound(entity: string, id: string): GraphQLError {
  return new GraphQLError(`${entity} with id "${id}" was not found`, {
    extensions: { code: "NOT_FOUND" },
  });
}
