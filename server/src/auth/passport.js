const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const MicrosoftStrategy = require('passport-microsoft').Strategy;
const prisma = require('../prisma');
const bcrypt = require('bcrypt');

const SERVER_BASE = process.env.SERVER_URL || 'http://localhost:4000';

async function findOrCreateUserOAuth(profile, provider) {
  const providerId = profile.id;
  let account = await prisma.account.findUnique({
    where: { provider_providerAccountId: { provider: provider, providerAccountId: providerId } },
    include: { user: true }
  });
  if (account) {
    return account.user;
  }
  let user = null;
  const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
  if (email) {
    user = await prisma.user.findUnique({ where: { email: email } });
  }
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: email || `${provider}_${profile.id}@example.com`,
        name: profile.displayName || profile.username || "Utilisateur",
        password: null, 
        darkMode: false,
        fontSize: 'MEDIUM'
      }
    });
  }
  await prisma.account.create({
    data: {
      provider: provider,
      providerAccountId: providerId,
      userId: user.id
    }
  });
  return user;
}

passport.use(new GoogleStrategy(
  {
    clientID: process.env.OAUTH_GOOGLE_CLIENT_ID,
    clientSecret: process.env.OAUTH_GOOGLE_CLIENT_SECRET,
    callbackURL: `${SERVER_BASE}/auth/google/callback` 
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

// --- GitHub ---
passport.use(new GitHubStrategy(
  {
    clientID: process.env.OAUTH_GITHUB_CLIENT_ID,
    clientSecret: process.env.OAUTH_GITHUB_CLIENT_SECRET,
    callbackURL: `${SERVER_BASE}/auth/github/callback` 
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

passport.use(new MicrosoftStrategy(
  {
    clientID: process.env.OAUTH_MICROSOFT_CLIENT_ID,
    clientSecret: process.env.OAUTH_MICROSOFT_CLIENT_SECRET,
    callbackURL: `${SERVER_BASE}/auth/microsoft/callback`,
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
