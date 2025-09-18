FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages ./packages
RUN npm ci --workspaces --include-workspace-root

FROM base AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm ci --workspaces --include-workspace-root && npm run build -w apps/web

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/web/.next ./apps/web/.next
COPY --from=build /app/apps/web/package.json ./apps/web/package.json
COPY --from=build /app/package.json ./
COPY --from=build /app/apps/web/public ./apps/web/public
COPY --from=build /app/packages ./packages
EXPOSE 3000
CMD ["npx","next","start","-p","3000","-r","apps/web"]
