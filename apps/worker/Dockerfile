FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps/worker/package.json apps/worker/package.json
RUN npm ci --omit=dev --workspaces --include-workspace-root

FROM base AS build
COPY . .
RUN npm ci --workspaces --include-workspace-root && npm run build -w apps/worker

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/worker/dist ./apps/worker/dist
COPY --from=build /app/package.json ./
COPY --from=build /app/apps/worker/package.json ./apps/worker/package.json
COPY --from=build /app/packages ./packages
CMD ["node","apps/worker/dist/src/worker.js"]
