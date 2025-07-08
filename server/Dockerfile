FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --production
COPY . .
# Générer le Prisma client
RUN npx prisma generate

# Lancer l'application
CMD ["node", "src/index.js"]
