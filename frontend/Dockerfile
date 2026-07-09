FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

FROM node:18-alpine

WORKDIR /app/dist

RUN npm install -g serve

COPY --from=builder /app/dist .

COPY --from=builder /app/serve.json .

EXPOSE 3000

CMD ["serve", "-c", "serve.json", "-s", ".", "-l", "3000"]
