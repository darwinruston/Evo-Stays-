# syntax=docker/dockerfile:1
#
# Production image for self-hosting. Multi-stage so the runtime layer carries
# only what `next start` actually needs, plus the Prisma bits (see below).
#
# Debian slim rather than Alpine: Prisma's query and schema engines are native
# binaries, and the glibc builds are the well-trodden path. The image is bigger
# and boringly reliable, which is the right trade for a box that just runs it.

FROM node:22-bookworm-slim AS base
# openssl is a hard requirement for Prisma's engines.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# --- dependencies ----------------------------------------------------------
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- build -----------------------------------------------------------------
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
# src/lib/prisma.ts constructs a PrismaClient at module scope, and Prisma
# validates the datasource URL on construction -- so `next build` needs *a*
# DATABASE_URL even though it never opens a connection. This throwaway value
# is not baked into the output; the real one arrives at runtime.
ENV DATABASE_URL="file:/tmp/build-placeholder.db"

RUN npx prisma generate
RUN npm run build

# The seed is TypeScript and normally runs through tsx (see package.json's
# prisma.seed). Shipping tsx and its esbuild dependency into the runtime image
# to run one script is wasteful, so bundle it to plain JS here instead --
# esbuild is already present as a tsx dependency. Used by the reset script.
RUN npx esbuild prisma/seed.ts \
    --bundle --platform=node --target=node22 \
    --external:@prisma/client --external:.prisma \
    --outfile=prisma/seed.js

# --- prisma CLI ------------------------------------------------------------
# `prisma migrate deploy` runs at container start, so the CLI has to be in the
# runtime image. It cannot be assembled by copying node_modules/prisma and
# node_modules/@prisma across -- the CLI also pulls in unscoped packages
# (`effect`, among others) and dies with MODULE_NOT_FOUND. Install it on its
# own here instead, which gives a complete, self-contained dependency tree.
# The version is read from package.json so it can never drift from the client
# the app was generated against.
FROM base AS prisma-cli
WORKDIR /cli
# package.json is read for the version only, then deleted BEFORE npm runs --
# `npm install <pkg>` in a directory with a package.json also installs
# everything that package.json lists, which drags the whole Next.js toolchain
# in and quadruples the image.
COPY package.json /tmp/package.json
RUN PRISMA_VERSION="$(node -p "require('/tmp/package.json').devDependencies.prisma")" \
    && rm /tmp/package.json \
    && npm install --no-save --no-package-lock "prisma@${PRISMA_VERSION}"

# --- runtime ---------------------------------------------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# `output: "standalone"` emits a self-contained server.js plus a pruned
# node_modules, but deliberately leaves out public/ and .next/static -- those
# are expected to come from a CDN. There is no CDN here, so copy them in and
# server.js serves them itself.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# The generated Prisma client and its query engine, which output file tracing
# does not reliably pick up. These are what the running app uses.
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# The migration CLI, kept in its own tree so its dependencies cannot collide
# with the pruned standalone node_modules. See the prisma-cli stage.
COPY --from=prisma-cli /cli/node_modules /opt/prisma/node_modules

# schema.prisma, the committed migrations, and the bundled seed.
COPY --from=builder /app/prisma ./prisma

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# /data holds the SQLite file, /app/storage the uploaded photos -- both are
# bind mounts in production. Created and chowned here so the image also runs
# standalone with anonymous volumes.
#
# `node` is uid/gid 1000 in the official images, which lines up with a typical
# first user on the host, so bind-mounted directories need no chown dance.
RUN mkdir -p /data /app/storage && chown -R node:node /data /app/storage

USER node
EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
