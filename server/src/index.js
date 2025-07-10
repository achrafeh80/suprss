const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const passport = require('passport');
const { ApolloServer } = require('apollo-server-express');
const { typeDefs } = require('./graphql/schema');
const { resolvers } = require('./graphql/resolvers');
const prisma = require('./prisma');           // Prisma client
require('./auth/passport');                  // Configure les stratégies Passport

// Chargement des variables d'environnement
dotenv.config();

// Crée l'application Express
const app = express();

// Configuration du CORS pour autoriser le frontend
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json());
app.use(passport.initialize());

// Routes d'authentification OAuth2 (Google, GitHub, Microsoft)
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
app.get('/auth/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/login' }), (req, res) => {
  // L'utilisateur OAuth est attaché à req.user
  const user = req.user;
  const token = require('jsonwebtoken').sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '2h' });
  // Redirige vers le frontend avec le token JWT dans le fragment d'URL
  res.redirect(`${FRONTEND_URL}/#token=${token}`);
});

app.get('/auth/github', passport.authenticate('github', { scope: ['user:email'], session: false }));
app.get('/auth/github/callback', passport.authenticate('github', { session: false, failureRedirect: '/login' }), (req, res) => {
  const user = req.user;
  const token = require('jsonwebtoken').sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '2h' });
  res.redirect(`${FRONTEND_URL}/#token=${token}`);
});

app.get('/auth/microsoft', passport.authenticate('microsoft', { scope: ['user.read'], session: false }));
app.get('/auth/microsoft/callback', passport.authenticate('microsoft', { session: false, failureRedirect: '/login' }), (req, res) => {
  const user = req.user;
  const token = require('jsonwebtoken').sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '2h' });
  res.redirect(`${FRONTEND_URL}/#token=${token}`);
});

// Initialise Apollo Server pour GraphQL
async function startServer() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: async ({ req }) => {
      // Vérifie le header Authorization pour récupérer l'utilisateur courant
      let user = null;
      const authHeader = req.headers.authorization || '';
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        try {
          const payload = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
          user = await prisma.user.findUnique({ where: { id: payload.userId } });
        } catch (e) {
          // Token invalide ou expiré
          user = null;
        }
      }
      return { prisma, user };
    }
  });
  await server.start();
  server.applyMiddleware({ app, path: '/graphql', cors: false });

  // Démarre le serveur Express
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, async () => {
    console.log(`✅ Serveur API GraphQL démarré sur http://localhost:${PORT}/graphql`);
    // Si aucune donnée initiale, peupler la base (utilisateurs, flux de démonstration)
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log("Seeding initial data...");
      await require('../prisma/seed');
      console.log("✅ Données initiales insérées.");
    }
  });
}

startServer().catch(error => {
  console.error("Erreur au démarrage du serveur:", error);
  process.exit(1);
});
