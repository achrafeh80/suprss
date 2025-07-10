const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const MicrosoftStrategy = require('passport-microsoft').Strategy;
const prisma = require('../prisma');
const bcrypt = require('bcrypt');

// Serialize/Deserialize non utilisés car on n'utilise pas de sessions (JWT stateless)

// Strategy pour authentification locale (email/mot de passe) non-passport (gérée via GraphQL login)

async function findOrCreateUserOAuth(profile, provider) {
  // Vérifie s'il existe un compte OAuth avec cet ID de provider
  const providerId = profile.id;
  let account = await prisma.account.findUnique({
    where: { provider_providerAccountId: { provider: provider, providerAccountId: providerId } },
    include: { user: true }
  });
  if (account) {
    return account.user;
  }
  // Aucun compte, vérifier si un utilisateur existe avec le même email
  let user = null;
  const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
  if (email) {
    user = await prisma.user.findUnique({ where: { email: email } });
  }
  if (!user) {
    // Crée un nouvel utilisateur
    user = await prisma.user.create({
      data: {
        email: email || `${provider}_${profile.id}@example.com`,
        name: profile.displayName || profile.username || "Utilisateur",
        password: null, // pas de mot de passe car OAuth
        // Préférences par défaut
        darkMode: false,
        fontSize: 'MEDIUM'
      }
    });
  }
  // Crée le compte OAuth associé
  await prisma.account.create({
    data: {
      provider: provider,
      providerAccountId: providerId,
      userId: user.id
    }
  });
  return user;
}

// Configuration de la stratégie Google
passport.use(new GoogleStrategy({
    clientID: process.env.OAUTH_GOOGLE_CLIENT_ID,
    clientSecret: process.env.OAUTH_GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL.replace(/\/$/, '')}/api/auth/google/callback` : "/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const user = await findOrCreateUserOAuth(profile, 'google');
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

// Configuration de la stratégie GitHub
passport.use(new GitHubStrategy({
    clientID: process.env.OAUTH_GITHUB_CLIENT_ID,
    clientSecret: process.env.OAUTH_GITHUB_CLIENT_SECRET,
    callbackURL: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL.replace(/\/$/, '')}/api/auth/github/callback` : "/auth/github/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const user = await findOrCreateUserOAuth(profile, 'github');
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

// Configuration de la stratégie Microsoft
passport.use(new MicrosoftStrategy({
    clientID: process.env.OAUTH_MICROSOFT_CLIENT_ID,
    clientSecret: process.env.OAUTH_MICROSOFT_CLIENT_SECRET,
    callbackURL: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL.replace(/\/$/, '')}/api/auth/microsoft/callback` : "/auth/microsoft/callback",
    scope: ['user.read']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const user = await findOrCreateUserOAuth(profile, 'microsoft');
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));
