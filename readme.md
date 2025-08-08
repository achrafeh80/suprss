# SUPRSS - Application

## 📌 Prérequis

Avant de lancer l'application avec **Docker**, vous devez créer un fichier **`.env`** à la racine du projet avec le contenu suivant :

```env
# ---- Base de données PostgreSQL ----
POSTGRES_USER=suprss
POSTGRES_PASSWORD=suprss
POSTGRES_DB=suprss

# L'URL de connexion à la base de données (utilisée par Prisma dans le serveur Node.js)
DATABASE_URL=postgresql://suprss:suprss@db:5432/suprss?schema=public

# ---- Secrets et tokens ----
# Secret JWT pour signer les tokens (à changer en production)
JWT_SECRET=your_jwt_secret_here

# ---- OAuth2 Credentials (à remplir avec vos identifiants OAuth) ----
OAUTH_GOOGLE_CLIENT_ID=test
OAUTH_GOOGLE_CLIENT_SECRET=test
OAUTH_GITHUB_CLIENT_ID=test
OAUTH_GITHUB_CLIENT_SECRET=test
OAUTH_MICROSOFT_CLIENT_ID=test
OAUTH_MICROSOFT_CLIENT_SECRET=test

# URL du frontend (utilisée pour rediriger après OAuth2 et configurer CORS)
FRONTEND_URL=http://localhost:3000

# URL de l'API GraphQL (utilisée par le frontend React pour les requêtes GraphQL)
REACT_APP_API_URL=http://localhost:4000/graphql
```

## 🚀 Lancement
Une fois le fichier .env en place, lancez les services avec Docker :

```
docker-compose up --build
```