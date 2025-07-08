
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Parser = require('rss-parser');
const prisma = require('../prisma/client'); // Prisma client instance
const parser = new Parser();

// Helper: générer un JWT pour un utilisateur
function generateToken(user) {
  return jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// Helper: vérifier JWT et renvoyer l'utilisateur
async function getUserFromToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return prisma.user.findUnique({ where: { id: decoded.userId } });
  } catch (e) {
    return null;
  }
}

const resolvers = {
  Query: {
    me: async (parent, args, context) => {
      // context.user est injecté depuis le token dans index.js
      return context.user || null;
    },
    myCollections: async (parent, args, context) => {
      if (!context.user) throw new Error("Not authenticated");
      // Récupère les collections où l'utilisateur est membre
      return prisma.collection.findMany({
        where: { memberships: { some: { userId: context.user.id } } },
        include: { owner: true }
      });
    },
    collection: async (parent, { id }, context) => {
      if (!context.user) throw new Error("Auth requise");
      // Vérifie que l'utilisateur est membre de la collection demandée
      const coll = await prisma.collection.findUnique({
        where: { id: id },
        include: {
          owner: true,
          memberships: { include: { user: true } },
          feeds: { include: { feed: true } }
        }
      });
      if (!coll) throw new Error("Collection inconnue");
      const isMember = await prisma.membership.findUnique({
        where: { userId_collectionId: { userId: context.user.id, collectionId: id } }
      });
      if (!isMember) throw new Error("Accès non autorisé à cette collection");
      return coll;
    },
    feeds: async (parent, { collectionId }, context) => {
      if (!context.user) throw new Error("Auth requise");
      // Vérifie membership:
      const member = await prisma.membership.findUnique({
        where: { userId_collectionId: { userId: context.user.id, collectionId } }
      });
      if (!member) throw new Error("Accès refusé");
      // Récupère tous les feeds de la collection
      const colFeeds = await prisma.collectionFeed.findMany({
        where: { collectionId },
        include: { feed: true }
      });
      // Extrait juste les objets Feed
      return colFeeds.map(cf => cf.feed);
    },
    articles: async (parent, { collectionId, feedId, unreadOnly, favoriteOnly, search }, context) => {
      if (!context.user) throw new Error("Auth requise");
      // Vérifie accès à la collection:
      const member = await prisma.membership.findUnique({
        where: { userId_collectionId: { userId: context.user.id, collectionId } }
      });
      if (!member) throw new Error("Accès refusé");
      // Construit le filtre Prisma
      let articleWhere = {};
      if (feedId) {
        articleWhere.feedId = feedId;
      } else {
        // si pas de feedId, on filtre sur tous les feeds de la collection
        const feedIds = (await prisma.collectionFeed.findMany({
          where: { collectionId }, select: { feedId: true }
        })).map(f => f.feedId);
        articleWhere.feedId = { in: feedIds };
      }
      if (search) {
        // Filtrage plein texte simple: on cherche le mot dans le titre ou le contenu
        // (NB: pour de vrai, on utiliserait peut-être PostgreSQL full-text search ou Elastic)
        articleWhere.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } }
        ];
      }
      // Récupère articles selon le filtre
      let articles = await prisma.article.findMany({
        where: articleWhere,
        include: { feed: true }
      });
      // Enrichit avec isRead/isFavorite à partir de UserArticle
      const states = await prisma.userArticle.findMany({
        where: { userId: context.user.id, articleId: { in: articles.map(a => a.id) } }
      });
      // Crée un dictionnaire des états
      const stateByArticle = {};
      states.forEach(s => {
        stateByArticle[s.articleId] = { isRead: s.isRead, isFavorite: s.isFavorite };
      });
      // Filtre en mémoire selon unreadOnly/favoriteOnly si spécifié
      articles = articles.filter(article => {
        const st = stateByArticle[article.id] || { isRead: false, isFavorite: false };
        if (unreadOnly && st.isRead) return false;
        if (favoriteOnly && !st.isFavorite) return false;
        return true;
      });
      // Ajoute champs isRead, isFavorite à chaque article (GraphQL nécessite de les résoudre dans Article)
      return articles.map(article => {
        const st = stateByArticle[article.id] || { isRead: false, isFavorite: false };
        return {
          ...article,
          isRead: st.isRead,
          isFavorite: st.isFavorite
        };
      });
    },
    comments: async (parent, { collectionId, articleId }, context) => {
      if (!context.user) throw new Error("Auth requise");
      // Vérifie que l'utilisateur est bien membre de la collection
      const member = await prisma.membership.findUnique({
        where: { userId_collectionId: { userId: context.user.id, collectionId } }
      });
      if (!member) throw new Error("Accès non autorisé aux commentaires");
      // Récupère les commentaires de cet article dans la collection
      return prisma.comment.findMany({
        where: { collectionId, articleId },
        include: { author: true }
      });
    },
    messages: async (parent, { collectionId }, context) => {
      if (!context.user) throw new Error("Auth requise");
      // Vérification accès collection
      const member = await prisma.membership.findUnique({
        where: { userId_collectionId: { userId: context.user.id, collectionId } }
      });
      if (!member) throw new Error("Accès refusé");
      // Récup messages de chat (on peut limiter aux X derniers)
      return prisma.message.findMany({
        where: { collectionId },
        orderBy: { createdAt: 'asc' },
        include: { author: true }
      });
    },
    exportFeeds: async (parent, { format }, context) => {
      if (!context.user) throw new Error("Auth requise");
      // Exporte tous les flux auxquels l'utilisateur est abonné (toutes collections)
      const feeds = await prisma.feed.findMany({
        where: { collections: { some: { collection: { memberships: { some: { userId: context.user.id } } } } } }
      });
      // Génère la sortie selon format
      if (format.toLowerCase() === 'opml') {
        // Construction d'un OPML basique
        let opml = `<?xml version="1.0" encoding="UTF-8"?>\n<opml version="1.0">\n<head><title>SUPRSS Export</title></head>\n<body>\n`;
        for (let feed of feeds) {
          opml += `  <outline type="rss" text="${feed.title}" xmlUrl="${feed.url}" />\n`;
        }
        opml += `</body>\n</opml>`;
        return opml;
      } else if (format.toLowerCase() === 'json') {
        return JSON.stringify(feeds);
      } else if (format.toLowerCase() === 'csv') {
        let csv = "title, url, tags, description\n";
        feeds.forEach(f => {
          csv += `"${f.title}","${f.url}","${f.tags || ''}","${f.description || ''}"\n`;
        });
        return csv;
      } else {
        throw new Error("Format non supporté");
      }
    }
  },
  Mutation: {
    register: async (parent, { email, password, name }, context) => {
      // Vérifie si email existe déjà
      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) throw new Error("Email déjà utilisé");
      // Hash du mot de passe
      const saltRounds = 10;
      const hashed = await bcrypt.hash(password, saltRounds);
      const user = await prisma.user.create({
        data: { email, password: hashed, name }
      });
      return { token: generateToken(user), user };
    },
    login: async (parent, { email, password }, context) => {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) throw new Error("Identifiants invalides");
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) throw new Error("Identifiants invalides");
      return { token: generateToken(user), user };
    },
    addOAuthConnection: async (parent, { provider, oauthCode }, context) => {
      // Cette mutation pourrait être utilisée soit pour un login OAuth initial, soit pour lier un compte OAuth à un compte existant
      // Pour simplifier: disons qu'on reçoit un code OAuth (après redirection) et qu'on échange contre un profil via l'API du provider
      // (En réalité, ceci pourrait nécessiter un appel HTTP côté serveur au service OAuth – implémentation simplifiée ici)
      let oauthId;
      if (provider === "GOOGLE") {
        // Simuler qu'on obtient l'ID Google de l'utilisateur via oauthCode
        oauthId = "google-" + oauthCode; 
      } else if (provider === "GITHUB") {
        oauthId = "github-" + oauthCode;
      } else if (provider === "MICROSOFT") {
        oauthId = "ms-" + oauthCode;
      }
      if (!oauthId) throw new Error("Provider inconnu");
      // Vérifie si un utilisateur existe déjà avec cette identité OAuth
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { googleId: provider === "GOOGLE" ? oauthId : undefined },
            { githubId: provider === "GITHUB" ? oauthId : undefined },
            { microsoftId: provider === "MICROSOFT" ? oauthId : undefined }
          ]
        }
      });
      if (!user) {
        if (!context.user) {
          // Pas connecté, on crée un nouveau compte automatiquement via OAuth
          user = await prisma.user.create({
            data: {
              email: oauthId + "@oauth.temp", // on utilise un email placeholder, idéalement on récupérerait l'email via l'API du provider
              password: "",  // pas de mot de passe local
              name: null,
              googleId: provider === "GOOGLE" ? oauthId : undefined,
              githubId: provider === "GITHUB" ? oauthId : undefined,
              microsoftId: provider === "MICROSOFT" ? oauthId : undefined
            }
          });
        } else {
          // Utilisateur connecté veut lier un compte OAuth à son compte existant
          user = await prisma.user.update({
            where: { id: context.user.id },
            data: {
              googleId: provider === "GOOGLE" ? oauthId : undefined,
              githubId: provider === "GITHUB" ? oauthId : undefined,
              microsoftId: provider === "MICROSOFT" ? oauthId : undefined
            }
          });
        }
      }
      // Retourne le token (pour connexion) et user
      return { token: generateToken(user), user };
    },
    createCollection: async (parent, { name, shared }, context) => {
      if (!context.user) throw new Error("Auth requise");
      const collection = await prisma.collection.create({
        data: {
          name,
          isShared: shared || false,
          ownerId: shared ? context.user.id : null,
          memberships: {
            create: {
              userId: context.user.id,
              role: shared ? "OWNER" : "READER"
            }
          }
        }
      });
      return collection;
    },
    inviteMember: async (parent, { collectionId, userEmail, role }, context) => {
      if (!context.user) throw new Error("Auth requise");
      // Seul propriétaire ou éditeur devrait pouvoir inviter
      const member = await prisma.membership.findUnique({
        where: { userId_collectionId: { userId: context.user.id, collectionId } }
      });
      if (!member) throw new Error("Accès refusé");
      if (!(member.role === "OWNER" || member.role === "EDITOR")) {
        throw new Error("Permission insuffisante pour inviter");
      }
      const userToAdd = await prisma.user.findUnique({ where: { email: userEmail } });
      if (!userToAdd) {
        throw new Error("Utilisateur avec cet email introuvable");
      }
      // Ajoute le membership
      await prisma.membership.create({
        data: { userId: userToAdd.id, collectionId, role: role || "READER" }
      });
      // On pourrait notifier le nouvel utilisateur par email ici
      // Renvoyer la collection mise à jour (avec liste membres)
      return prisma.collection.findUnique({
        where: { id: collectionId },
        include: { memberships: { include: { user: true } } }
      });
    },
    addFeed: async (parent, { collectionId, url }, context) => {
      if (!context.user) throw new Error("Auth requise");
      // Vérifie que l'utilisateur a droit d'ajouter (OWNER ou EDITOR par exemple)
      const member = await prisma.membership.findUnique({
        where: { userId_collectionId: { userId: context.user.id, collectionId } }
      });
      if (!member) throw new Error("Accès refusé");
      if (!(member.role === "OWNER" || member.role === "EDITOR")) {
        throw new Error("Vous n'avez pas les droits pour ajouter un flux");
      }
      // Si le flux existe déjà globalement (même URL), on le réutilise
      let feed = await prisma.feed.findUnique({ where: { url } });
      if (!feed) {
        // Nouveau flux: on utilise rss-parser pour le lire
        try {
          const parsed = await parser.parseURL(url);
          feed = await prisma.feed.create({
            data: {
              title: parsed.title || "Sans titre",
              url,
              description: parsed.description || "",
              siteUrl: parsed.link || "",
              tags: "", // l'utilisateur pourra éditer les tags plus tard
              status: "active",
              lastFetched: new Date(),
            }
          });
          // Insérer les articles du flux
          const items = parsed.items || [];
          for (const item of items) {
            await prisma.article.create({
              data: {
                feedId: feed.id,
                title: item.title || "(Sans titre)",
                link: item.link || "",
                author: item.creator || item.author || "",
                pubDate: item.isoDate ? new Date(item.isoDate) : new Date(),
                content: item.contentSnippet || item.content || "",
                snippet: item.contentSnippet || ""
              }
            });
          }
        } catch (err) {
          throw new Error("Échec de l'ajout du flux (URL invalide ou inaccessible)");
        }
      }
      // Lier le feed à la collection (si pas déjà lié)
      try {
        await prisma.collectionFeed.create({
          data: { collectionId, feedId: feed.id }
        });
      } catch (e) {
        // si déjà existant, ignore l'erreur unique
      }
      // Optionnel: déclencher une mise à jour immédiate asynchrone du flux, ou planifier le polling
      return feed;
    },
    removeFeed: async (parent, { collectionId, feedId }, context) => {
      if (!context.user) throw new Error("Auth requise");
      const member = await prisma.membership.findUnique({
        where: { userId_collectionId: { userId: context.user.id, collectionId } }
      });
      if (!member || !(member.role === "OWNER" || member.role === "EDITOR")) {
        throw new Error("Permission refusée");
      }
      // Supprime le lien entre la collection et le feed
      await prisma.collectionFeed.deleteMany({
        where: { collectionId, feedId }
      });
      // Ne supprime pas le feed globalement, il peut être dans d'autres collections
      // Renvoyer la collection mise à jour éventuellement
      return prisma.collection.findUnique({
        where: { id: collectionId },
        include: { feeds: { include: { feed: true } } }
      });
    },
    markArticleRead: async (parent, { articleId, read }, context) => {
      if (!context.user) throw new Error("Auth requise");
      const data = { userId: context.user.id, articleId };
      if (read) {
        // crée ou met à jour en mettant isRead = true
        await prisma.userArticle.upsert({
          where: { userId_articleId: { userId: context.user.id, articleId } },
          create: { ...data, isRead: true, isFavorite: false },
          update: { isRead: true }
        });
      } else {
        // Marquer non lu -> soit supprimer l'enregistrement, soit mettre isRead à false
        await prisma.userArticle.updateMany({
          where: { userId: context.user.id, articleId },
          data: { isRead: false }
        });
      }
      // renvoyer l'article (on peut inclure le champ isRead via le résolveur Article)
      const article = await prisma.article.findUnique({ where: { id: articleId }, include: { feed: true } });
      return { ...article, isRead: read, isFavorite: false };
    },
    toggleFavorite: async (parent, { articleId, favorite }, context) => {
      if (!context.user) throw new Error("Auth requise");
      const data = { userId: context.user.id, articleId };
      if (favorite) {
        await prisma.userArticle.upsert({
          where: { userId_articleId: { userId: context.user.id, articleId } },
          create: { ...data, isRead: true, isFavorite: true },
          update: { isFavorite: true }
        });
      } else {
        await prisma.userArticle.updateMany({
          where: { userId: context.user.id, articleId },
          data: { isFavorite: false }
        });
      }
      const article = await prisma.article.findUnique({ where: { id: articleId }, include: { feed: true } });
      const state = await prisma.userArticle.findUnique({
        where: { userId_articleId: { userId: context.user.id, articleId } }
      });
      return { 
        ...article, 
        isRead: state ? state.isRead : false, 
        isFavorite: state ? state.isFavorite : false 
      };
    },
    addComment: async (parent, { collectionId, articleId, content }, context) => {
      if (!context.user) throw new Error("Auth requise");
      // Vérifie membership (doit au moins être READER, on autorise tous les membres à commenter)
      const member = await prisma.membership.findUnique({
        where: { userId_collectionId: { userId: context.user.id, collectionId } }
      });
      if (!member) throw new Error("Accès refusé à la collection pour commenter");
      // Crée le commentaire
      const comment = await prisma.comment.create({
        data: {
          content,
          authorId: context.user.id,
          articleId,
          collectionId
        },
        include: { author: true }
      });
      // (On pourrait notifier les autres membres de la collection d'un nouveau commentaire via subscription)
      return comment;
    },
    sendMessage: async (parent, { collectionId, content }, context) => {
      if (!context.user) throw new Error("Auth requise");
      const member = await prisma.membership.findUnique({
        where: { userId_collectionId: { userId: context.user.id, collectionId } }
      });
      if (!member) throw new Error("Accès refusé au chat de cette collection");
      const msg = await prisma.message.create({
        data: {
          content,
          authorId: context.user.id,
          collectionId
        },
        include: { author: true }
      });
      // Ici, on pourrait émettre une notification temps réel via pubsub (GraphQL subscription) aux clients
      return msg;
    },
    updatePassword: async (parent, { oldPassword, newPassword }, context) => {
      if (!context.user) throw new Error("Auth requise");
      const user = await prisma.user.findUnique({ where: { id: context.user.id } });
      const valid = await bcrypt.compare(oldPassword, user.password);
      if (!valid) throw new Error("Ancien mot de passe incorrect");
      const newHash = await bcrypt.hash(newPassword, 10);
      const updated = await prisma.user.update({
        where: { id: context.user.id },
        data: { password: newHash }
      });
      return updated;
    },
    updateUserSettings: async (parent, { darkMode, fontSize }, context) => {
      if (!context.user) throw new Error("Auth requise");
      // On suppose avoir des champs darkMode, fontSize dans User (non inclus plus haut pour simplifier)
      const updated = await prisma.user.update({
        where: { id: context.user.id },
        data: {
          // ces champs seraient ajoutés au modèle User si on implémente cette fonctionnalité
          // darkMode: darkMode ?? undefined,
          // fontSize: fontSize ?? undefined
        }
      });
      return updated;
    },
    importFeeds: async (parent, { fileContent, format }, context) => {
      if (!context.user) throw new Error("Auth requise");
      // Par simplicité, on importe dans la collection personnelle principale de l'utilisateur
      // (Par ex, la première collection privée de l'user, ou on peut en créer une spéciale "Import")
      let personalColl = await prisma.collection.findFirst({
        where: { isShared: false, memberships: { some: { userId: context.user.id } } }
      });
      if (!personalColl) {
        personalColl = await prisma.collection.create({
          data: {
            name: "Mes flux",
            isShared: false,
            memberships: { create: { userId: context.user.id, role: "READER" } }
          }
        });
      }
      if (format.toLowerCase() === "opml") {
        // Parse OPML simple (on recherche des xmlUrl dans le contenu)
        const regex = /xmlUrl="([^"]+)"/g;
        let match;
        while ((match = regex.exec(fileContent)) !== null) {
          const url = match[1];
          // on utilise addFeed pour chaque URL
          try {
            await resolvers.Mutation.addFeed(null, { collectionId: personalColl.id, url }, { user: context.user });
          } catch(e) {
            console.error("Erreur import flux:", e);
          }
        }
      } else if (format.toLowerCase() === "json") {
        try {
          const feeds = JSON.parse(fileContent);
          for (const f of feeds) {
            if (f.url) {
              await resolvers.Mutation.addFeed(null, { collectionId: personalColl.id, url: f.url }, { user: context.user });
            }
          }
        } catch(e) {
          throw new Error("JSON invalide");
        }
      } else if (format.toLowerCase() === "csv") {
        const lines = fileContent.split("\\n");
        for (let line of lines.slice(1)) {
          const cols = line.split(',');
          if (cols[1]) {
            const url = cols[1].replace(/\"/g, ''); // deuxième colonne supposée être URL
            if (url.startsWith("http")) {
              await resolvers.Mutation.addFeed(null, { collectionId: personalColl.id, url }, { user: context.user });
            }
          }
        }
      }
      return personalColl;
    }
  },
  // Résolveur custom pour certains champs complexes (ex: champs virtuels ou relations non gérées par Prisma automatiquement)
  Article: {
    // Ces champs isRead et isFavorite sont déjà calculés dans Query.articles pour la liste.
    // Si on récupère un seul article ailleurs, on pourrait faire la jointure ici.
    isRead: async (article, args, context) => {
      if (!context.user) return false;
      if (typeof article.isRead !== "undefined") return article.isRead;
      const ua = await prisma.userArticle.findUnique({
        where: { userId_articleId: { userId: context.user.id, articleId: article.id } }
      });
      return ua ? ua.isRead : false;
    },
    isFavorite: async (article, args, context) => {
      if (!context.user) return false;
      if (typeof article.isFavorite !== "undefined") return article.isFavorite;
      const ua = await prisma.userArticle.findUnique({
        where: { userId_articleId: { userId: context.user.id, articleId: article.id } }
      });
      return ua ? ua.isFavorite : false;
    }
  },
  Collection: {
    // On peut implémenter le champ feeds au besoin, mais Prisma nous l'a déjà fourni via include dans collection query
    feeds: async (collection, args, context) => {
      // Si le champ feeds n'était pas inclus automatiquement, on pourrait faire:
      return prisma.feed.findMany({
        where: { collections: { some: { collectionId: collection.id } } }
      });
    },
    members: async (collection, args, context) => {
      const memberships = await prisma.membership.findMany({
        where: { collectionId: collection.id },
        include: { user: true }
      });
      // formate en { user, role }
      return memberships.map(m => ({ user: m.user, role: m.role }));
    },
    articles: async (collection, { unreadOnly, favoriteOnly, search }, context) => {
      // On peut réutiliser la logique de Query.articles en appelant directement resolvers.Query.articles
      return resolvers.Query.articles(null, { collectionId: collection.id, feedId: null, unreadOnly, favoriteOnly, search }, context);
    },
    comments: async (collection, { articleId }, context) => {
      return prisma.comment.findMany({
        where: { collectionId: collection.id, articleId },
        include: { author: true }
      });
    },
    messages: async (collection, args, context) => {
      return prisma.message.findMany({
        where: { collectionId: collection.id },
        include: { author: true },
        orderBy: { createdAt: 'asc' }
      });
    }
  }
};
module.exports = resolvers;
