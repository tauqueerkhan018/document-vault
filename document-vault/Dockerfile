FROM oven/bun:1 AS base
WORKDIR /app

COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

COPY . .
RUN bunx prisma generate

ENV NODE_ENV=production
EXPOSE 4000

CMD ["bun", "run", "src/server.ts"]
