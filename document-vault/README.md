# Document Vault — GraphQL API

A small backend API for organizing documents into collections, built with
Bun, TypeScript (strict), GraphQL Yoga (schema-first), Prisma, and
PostgreSQL.

## Stack

- **Runtime:** Bun + TypeScript (`strict: true`, no `any`)
- **API:** GraphQL Yoga, schema-first (`src/schema/schema.graphql` + resolvers)
- **Database:** PostgreSQL via Docker Compose
- **ORM:** Prisma, all schema changes via `prisma migrate dev`

## Setup (one command, after cloning)

```bash
docker compose up -d && bun install && bun run gendb && bun run dev
```

This starts Postgres in Docker, installs dependencies, generates the
Prisma client and applies migrations, then starts the API at
`http://localhost:4000/graphql`.

Copy `.env.example` to `.env` first if you want to change the port or DB
credentials — the defaults in `.env.example` match `docker-compose.yml`.

## Scripts

| Command | What it does |
|---|---|
| `bun run dev` | Start the API server |
| `bun run gendb` | Generate Prisma client + run dev migrations |
| `bun run lint` | ESLint |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run test` | Unit + integration tests |
| `bun run sanity` | lint + typecheck + test in one command |

## Domain

- **Collection** — `id`, `name`, `slug` (unique), `createdAt`
- **Document** — `id`, `title`, `content`, `tags: [String!]`, `collectionId`, `isArchived`, `createdAt`

## API

**Queries**
- `collections`
- `collection(id)` — includes nested `documents`
- `documents(collectionId, search, isArchived, take, cursor)` — cursor-paginated; `search` is a case-insensitive substring match against title OR content

**Mutations**
- `createCollection(name, slug)`
- `createDocument(title, content, collectionId, tags)`
- `updateDocument(id, title, content, tags, isArchived)` — partial update, only supplied fields change
- `deleteDocument(id)`
- `moveDocument(id, collectionId)`

## Validation & errors

Empty titles, empty content, and malformed slugs are rejected with a
`BAD_USER_INPUT` GraphQL error before touching the database. References
to a collection or document that doesn't exist return a `NOT_FOUND`
GraphQL error. Neither case reaches an unhandled exception / 500.

## Pagination

Cursor-based on `(createdAt desc, id desc)`. Each page fetches `take + 1`
rows to detect whether a next page exists without a separate `COUNT`
query; `nextCursor` is the last item's `id`, or `null` on the last page.
`take` defaults to 20 and is capped at 100 server-side.

## Tests

- `tests/unit/` — resolver logic against a mocked Prisma client (no DB required)
- `tests/integration/` — exercises real resolvers against the Dockerized Postgres instance end-to-end (create → search → paginate → move → validation error)

Run everything with `bun run test`, or split with `bun run test:unit` /
`bun run test:integration`.

## Tradeoffs & decisions

- **Schema-first over code-first.** The assignment specifies GraphQL Yoga schema-first, and it keeps the contract in one readable file separate from resolver implementation.
- **Flat mutation args over input types.** For 4–5 fields per mutation, `input` types add indirection without much payoff at this scale; I'd introduce them if the schema grew larger or fields started being reused across mutations.
- **`take + 1` pagination instead of a count query.** Cheaper than a second round-trip to Postgres per page; the tradeoff is fetching one extra row per request, which is negligible at these page sizes.
- **cuid IDs instead of auto-increment ints.** Keeps IDs non-guessable and generation client-side-safe, at the cost of slightly larger index size — a reasonable default even with auth explicitly out of scope here.
- **Tags stored as a Postgres `String[]` column** rather than a join table. Simpler and sufficient since tags aren't queried/filtered on in this scope; I'd move to a join table (`Tag`, `DocumentTag`) the moment tag-based filtering or tag management becomes a requirement.
- **No soft-delete.** `deleteDocument` is a hard delete. Archiving (`isArchived`) already covers the "hide but keep" use case the spec asks for, so a second, overlapping soft-delete mechanism felt like unnecessary surface area.

## How I'd extend this

- **Tag-based filtering** — add a `tags: [String!]` filter arg to `documents`, backed by a Postgres `@>` (array-contains) query or a normalized join table if tag management (rename/merge) becomes a need.
- **Auth/ownership** — scope collections and documents to a `userId`, add an auth directive on mutations. Deliberately out of scope here, but the resolver layer is already structured so this would sit in `context.ts` (attach the authenticated user) and a thin authorization check per resolver.
- **Full-text search** — swap the `contains` substring match for Postgres `tsvector`/`tsquery` (or a `GIN` trigram index) once search relevance or performance on large content bodies matters.
- **DataLoader** — `Document.collection` and `Collection.documents` currently do a query per parent; batching with DataLoader would fix N+1s once nested queries get deep or high-traffic.

## Tests

The project includes unit and integration tests covering:

- Collection creation and validation
- Document creation and validation
- Document search and pagination
- Moving documents between collections
- GraphQL error handling