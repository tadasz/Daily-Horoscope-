FROM node:22-alpine

WORKDIR /app

COPY api/package*.json ./
RUN npm ci --production

COPY api/ .
COPY landing/ /app/landing/

EXPOSE 3001

CMD ["node", "src/index.js"]
