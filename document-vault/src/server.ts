import { createYoga, createSchema } from "graphql-yoga";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolvers } from "./resolvers/index.js";
import { createContext } from "./context.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const typeDefs = readFileSync(join(__dirname, "schema", "schema.graphql"), "utf-8");

const schema = createSchema({ typeDefs, resolvers });

const yoga = createYoga({
  schema,
  context: createContext,
  graphqlEndpoint: "/graphql",
});

const port = Number(process.env.PORT ?? 4000);

Bun.serve({
  port,
  fetch: yoga.fetch,
});

// eslint-disable-next-line no-console
console.log(`Document Vault API ready at http://localhost:${port}/graphql`);
