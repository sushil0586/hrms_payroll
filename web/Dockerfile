FROM node:24-slim@sha256:c86ecead9e55a5210ac1727de38a4ca840bf03dcaf34dc9749addbf383b1920c AS deps
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY web/package.json web/package.json
COPY mobile/package.json mobile/package.json
COPY packages packages
RUN pnpm install --frozen-lockfile

FROM node:24-slim@sha256:c86ecead9e55a5210ac1727de38a4ca840bf03dcaf34dc9749addbf383b1920c AS builder
ARG HRMS_API_BASE_URL
ARG HRMS_ENABLE_DEMO_DATA=false
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NEXT_TELEMETRY_DISABLED=1
ENV HRMS_API_BASE_URL=$HRMS_API_BASE_URL
ENV HRMS_ENABLE_DEMO_DATA=$HRMS_ENABLE_DEMO_DATA
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/web/node_modules ./web/node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY web web
COPY packages packages
RUN pnpm --dir web build
RUN mkdir -p /app/runtime-data/.hrms-data

FROM gcr.io/distroless/cc-debian12:nonroot@sha256:9dac0a79194e45a7da0158a9c6da57b217585af0786db3845d1f0ec1a0dd182f AS runtime
ENV NODE_ENV=production
ENV HRMS_ENVIRONMENT=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
WORKDIR /app
COPY --from=builder /usr/local/bin/node /nodejs/bin/node
COPY --from=builder --chown=nonroot:nonroot /app/web/.next/build/standalone ./
COPY --from=builder --chown=nonroot:nonroot /app/web/.next/build/static ./web/.next/build/static
COPY --from=builder --chown=nonroot:nonroot /app/runtime-data/.hrms-data ./.hrms-data
EXPOSE 3000
ENTRYPOINT ["/nodejs/bin/node"]
CMD ["web/server.js"]
