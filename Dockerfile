FROM node:20-alpine AS base

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
COPY services ./services
COPY prisma ./prisma
COPY tsconfig.json ./

RUN npm install

RUN npx prisma generate


FROM node:20-alpine AS gateway

WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=base /app .

WORKDIR /app/services/transaction-gateway

EXPOSE 3001

CMD ["npm", "run", "start"]


FROM node:20-alpine AS ledger

WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=base /app .

WORKDIR /app/services/ledger-service

EXPOSE 3002

CMD ["npm", "run", "start"]


FROM node:20-alpine AS analytics

WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=base /app .

WORKDIR /app/services/analytics-worker

EXPOSE 3003

CMD ["npm", "run", "start"]