FROM node:20-alpine AS base
WORKDIR /app

# Install root deps separately for better caching
FROM base AS deps
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps/api/package.json apps/api/package.json
RUN npm ci --omit=dev --workspaces --include-workspace-root

FROM base AS build
COPY . .
RUN npm ci --workspaces --include-workspace-root && npm run build -w apps/api

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/package.json ./
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/packages ./packages
CMD ["node","apps/api/dist/src/server.js"]
