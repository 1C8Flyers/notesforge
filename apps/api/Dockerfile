FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
COPY tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY apps/mobile/package.json apps/mobile/package.json

RUN npm ci

COPY apps/api apps/api

RUN npm run build -w apps/api

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY apps/mobile/package.json apps/mobile/package.json
RUN npm ci --omit=dev

COPY --from=build /app/apps/api/dist apps/api/dist

EXPOSE 4000
CMD ["npm", "run", "start", "-w", "apps/api"]
