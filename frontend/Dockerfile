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

COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY index.html ./
COPY src ./src
COPY public ./public

RUN npm run build

FROM node:20 AS development
WORKDIR /app

ENV NODE_ENV=development

COPY package*.json ./
RUN rm -rf node_modules package-lock.json && npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM nginx:alpine AS production
WORKDIR /usr/share/nginx/html

COPY --from=build /app/dist .
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
