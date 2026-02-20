FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
COPY tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY apps/mobile/package.json apps/mobile/package.json

RUN npm ci

COPY apps/worker apps/worker

RUN npm run build -w apps/worker

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY apps/mobile/package.json apps/mobile/package.json
RUN npm ci --omit=dev

COPY --from=build /app/apps/worker/dist apps/worker/dist

CMD ["npm", "run", "start", "-w", "apps/worker"]
