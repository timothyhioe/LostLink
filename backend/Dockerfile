FROM node:20-alpine AS base
WORKDIR /app

COPY package*.json ./
ARG NODE_ENV=production
RUN if [ "$NODE_ENV" = "development" ]; then \
        npm ci; \
    else \
        npm ci --omit=dev; \
    fi

FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json tsconfig.json
COPY src src
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY --from=base /app/node_modules node_modules
COPY --from=build /app/dist dist
COPY package*.json ./

EXPOSE 5000

CMD ["node", "dist/server.js"]

