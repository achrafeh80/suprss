
require('dotenv').config();
const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const { readFileSync } = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const resolvers = require('./resolvers');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
// (Optionnel: configuration Passport OAuth)
const passport = require('passport');
require('./oauthStrategies')(passport); // un module où on configurerait GoogleStrategy, etc.
const app = express();

// Middleware CORS (autoriser le front-end)
const corsOptions = {
  origin: '*'  // en production, on restreindrait à l'URL du client
};
const cors = require('cors');
app.use(cors(corsOptions));

// Middleware pour parser JSON (si on avait des routes REST pour upload par ex.)
app.use(express.json());

// Initialiser Passport (OAuth2)
app.use(passport.initialize());

// Chargement du schéma GraphQL (SDL) et démarrage ApolloServer
const typeDefs = readFileSync(path.join(__dirname, 'schema.graphql'), 'utf8');
const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    // Extrait le token JWT de l'en-tête Authorization s'il existe
    const token = req.headers.authorization?.replace('Bearer ', '');
    let user = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      } catch (err) {
        console.warn("JWT invalide ou expiré");
      }
    }
    return { user, prisma };
  }
});
(async () => {
  await apolloServer.start();
  apolloServer.applyMiddleware({ app, path: '/graphql', cors: corsOptions });
  // Routes OAuth2 (exemple Google)
  app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  app.get('/auth/google/callback', passport.authenticate('google', { session: false }), (req, res) => {
    // Succès OAuth: générer un JWT et rediriger vers le client avec ce token
    const token = jwt.sign({ userId: req.user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    // Rediriger vers le frontend avec le token (par ex. https://app.suprss.com/oauth-callback?token=...)
    res.redirect(`${process.env.CLIENT_URL}/oauth-callback?token=${token}`);
  });
  // (Idem pour GitHub, Microsoft routes si nécessaire)
  
  // Démarrer le serveur HTTP
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`🚀 Serveur GraphQL démarré sur http://localhost:${PORT}/graphql`);
  });
})();
