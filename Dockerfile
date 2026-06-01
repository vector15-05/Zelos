FROM oven/bun:1-alpine AS builder

WORKDIR /app

COPY . .

RUN bun install

FROM oven/bun:1-alpine AS release

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps ./apps
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/package.json ./
USER bun
EXPOSE 3000
CMD ["bun", "run", "apps/api/src/server.ts"]
