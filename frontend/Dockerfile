FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV SHOPZONE_DATA_MODE=backend
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 shopzone && adduser --system --uid 1001 --ingroup shopzone shopzone
COPY --from=build --chown=shopzone:shopzone /app/.next/standalone ./
COPY --from=build --chown=shopzone:shopzone /app/.next/static ./.next/static
COPY --from=build --chown=shopzone:shopzone /app/public ./public
USER shopzone
EXPOSE 3000
CMD ["node","server.js"]
