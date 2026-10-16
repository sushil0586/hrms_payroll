FROM node:24-slim AS deps
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY web/package.json web/package.json
COPY mobile/package.json mobile/package.json
COPY packages packages
RUN pnpm install --frozen-lockfile

FROM node:24-slim AS builder
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/web/node_modules ./web/node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY web web
COPY packages packages
RUN pnpm --dir web build

FROM node:24-slim AS runtime
ENV NODE_ENV=production
ENV HRMS_ENVIRONMENT=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_DIST_DIR=.next/build
WORKDIR /app
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/web ./web
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/web/node_modules ./web/node_modules
RUN mkdir -p /app/.hrms-data && chown -R node:node /app/.hrms-data
USER node
EXPOSE 3000
CMD ["node", "web/node_modules/next/dist/bin/next", "start", "web"]
