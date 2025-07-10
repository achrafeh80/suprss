# Étape de build
FROM node:16-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY public ./public
COPY src ./src

# Intégrer la variable d'API si fournie lors du build
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

RUN npm run build

# Étape finale: utiliser un serveur web statique (nginx)
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
# Copie également un fichier de configuration nginx si nécessaire (non requis par défaut pour du SPA)
EXPOSE 80
