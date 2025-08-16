const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const passport = require('passport');
const { ApolloServer } = require('apollo-server-express');
const jwt = require('jsonwebtoken');

const { typeDefs } = require('./graphql/schema');
const { resolvers } = require('./graphql/resolvers');
const prisma = require('./prisma');

dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

require('./auth/passport');

const app = express();

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());
app.use(passport.initialize());

// GOOGLE
app.get(
  '/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

app.get(
  '/auth/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${FRONTEND_URL}/login` }),
  (req, res) => {
    const user = req.user;
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '2h' });
    res.redirect(`${FRONTEND_URL}/#token=${token}`);
  }
);

// GITHUB
app.get(
  '/auth/github',
  passport.authenticate('github', { scope: ['user:email'], session: false })
);

app.get(
  '/auth/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: `${FRONTEND_URL}/login` }),
  (req, res) => {
    const user = req.user;
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '2h' });
    res.redirect(`${FRONTEND_URL}/#token=${token}`);
  }
);

// MICROSOFT
app.get(
  '/auth/microsoft',
  passport.authenticate('microsoft', { scope: ['user.read'], session: false })
);

app.get(
  '/auth/microsoft/callback',
  passport.authenticate('microsoft', { session: false, failureRedirect: `${FRONTEND_URL}/login` }),
  (req, res) => {
    const user = req.user;
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '2h' });
    res.redirect(`${FRONTEND_URL}/#token=${token}`);
  }
);


async function startServer() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: async ({ req }) => {
      let user = null;
      const authHeader = req.headers.authorization || '';
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        try {
          const payload = jwt.verify(token, process.env.JWT_SECRET);
          user = await prisma.user.findUnique({ where: { id: payload.userId } });
        } catch (e) {
          user = null;
        }
      }
      return { prisma, user };
    },
  });

  await server.start();

  server.applyMiddleware({ app, path: '/graphql', cors: false });

  app.get('/', (_req, res) => {
    res.send('SUPRSS API is running. Visit /graphql for GraphQL endpoint.');
  });

  app.listen(PORT, async () => {
    console.log(`✅ Serveur API GraphQL démarré sur http://localhost:${PORT}/graphql`);

    try {
      const userCount = await prisma.user.count();
      if (userCount === 0) {
        console.log('Seeding initial data...');
        await require('../prisma/seed');
        console.log('✅ Données initiales insérées.');
      }
    } catch (e) {
      console.warn('⚠️  Seed ignoré (prisma indisponible ou erreur non bloquante) :', e.message);
    }
  });
}

startServer().catch((error) => {
  console.error('Erreur au démarrage du serveur:', error);
  process.exit(1);
});
