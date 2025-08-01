const { GraphQLScalarType, Kind } = require('graphql');
const Parser = require('rss-parser');
const parser = new Parser();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClientKnownRequestError } = require('@prisma/client/runtime');

const DateTime = new GraphQLScalarType({
  name: 'DateTime',
  description: 'DateTime scalar type',
  parseValue: value => new Date(value),
  serialize: value => (value instanceof Date ? value.toISOString() : null),
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  }
});

const resolvers = {
  DateTime,

  User: {
    // Retourne les collections dont l'utilisateur est membre
    collections: async (parent, args, { prisma, user }) => {
      if (!user) return [];
      // Cherche toutes les collections où userId = parent.id (si parent.id == user.id ou si admin regarde profil d'autrui)
      const memberships = await prisma.collectionMembership.findMany({
        where: { userId: parent.id },
        include: { collection: true }
      });
      return memberships.map(m => m.collection);
    }
  },

  Collection: {
    owner: async (parent, args, { prisma }) => {
      if (parent.ownerId) {
        return prisma.user.findUnique({ where: { id: parent.ownerId } });
      }
      return null;
    },
    feeds: async (parent, args, { prisma, user }) => {
      // Vérifie que l'utilisateur courant a accès à cette collection
      if (!user) return [];
      const membership = await prisma.collectionMembership.findUnique({
        where: { userId_collectionId: { userId: user.id, collectionId: parent.id } }
      });
      if (!membership) return [];  // pas d'accès
      // Récupère tous les feeds de cette collection
      const collectionFeeds = await prisma.collectionFeed.findMany({
        where: { collectionId: parent.id },
        include: { feed: true }
      });
      return collectionFeeds.map(cf => cf.feed);
    },
    members: async (parent, args, { prisma, user }) => {
      // Liste des membres (utilisateur + rôle)
      const memberships = await prisma.collectionMembership.findMany({
        where: { collectionId: parent.id },
        include: { user: true }
      });
      return memberships.map(m => ({
        user: m.user,
        role: m.role
      }));
    },
    articles: async (parent, args, { prisma, user }) => {
      if (!user) return [];
      // Vérifie accès
      const membership = await prisma.collectionMembership.findUnique({
        where: { userId_collectionId: { userId: user.id, collectionId: parent.id } }
      });
      if (!membership) return [];
      // Récupère les feeds de la collection
      const feedsInCollection = await prisma.collectionFeed.findMany({
        where: { collectionId: parent.id }
      });
      const feedIds = feedsInCollection.map(cf => cf.feedId);
      if (feedIds.length === 0) return [];
      // Construit le filtre de base
      let articleWhere = { feedId: { in: feedIds } };
      // Filtrer par feedId spécifique si fourni
      if (args.feedId) {
        articleWhere.feedId = Number(args.feedId);
      }
      // Filtrer par tag (le flux doit contenir ce tag)
      if (args.tag) {
        // Trouve les ids de feeds qui ont ce tag
        const taggedFeeds = await prisma.feed.findMany({
          where: { id: { in: feedIds }, tags: { has: args.tag } },
          select: { id: true }
        });
        const taggedIds = taggedFeeds.map(f => f.id);
        articleWhere.feedId = { in: taggedIds };
      }
      // Exclure/Inclure les lus/favoris
      if (args.unread === true) {
        // Unread: pas d'enregistrement ou isRead=false
        // On récupère tous les articles correspondant et on filtrera ceux qui ont un ArticleStatus isRead true
        // Simplification: on exclut ceux marqués comme lus
        const readArticles = await prisma.articleStatus.findMany({
          where: { userId: user.id, isRead: true },
          select: { articleId: true }
        });
        const readIds = readArticles.map(r => r.articleId);
        if (readIds.length > 0) {
          articleWhere.id = { notIn: readIds };
        }
      }
      if (args.unread === false) {
        // Récupère seulement ceux marqués lus
        const readArticles = await prisma.articleStatus.findMany({
          where: { userId: user.id, isRead: true },
          select: { articleId: true }
        });
        const readIds = readArticles.map(r => r.articleId);
        if (readIds.length > 0) {
          articleWhere.id = { in: readIds };
        } else {
          return []; // Aucun article lu
        }
      }
      if (args.favorite === true) {
        const favArticles = await prisma.articleStatus.findMany({
          where: { userId: user.id, isFavorite: true },
          select: { articleId: true }
        });
        const favIds = favArticles.map(f => f.articleId);
        if (favIds.length > 0) {
          articleWhere.id = { in: favIds };
        } else {
          return [];
        }
      }
      // Recherche plein texte (sur le titre et contenu)
      if (args.search) {
        const term = args.search;
        articleWhere.OR = [
          { title: { contains: term, mode: 'insensitive' } },
          { content: { contains: term, mode: 'insensitive' } }
        ];
      }
      // Récupère les articles selon les critères
      const articles = await prisma.article.findMany({
        where: articleWhere,
        include: { feed: true }
      });
      // Trier par date de publication descendante (plus récents en premier)
      articles.sort((a, b) => b.published - a.published);
      return articles;
    },
    messages: async (parent, args, { prisma, user }) => {
      if (!user) return [];
      // Vérifie accès du user à la collection
      const membership = await prisma.collectionMembership.findUnique({
        where: { userId_collectionId: { userId: user.id, collectionId: parent.id } }
      });
      if (!membership) return [];
      // Récupère tous les messages de la collection, triés par date croissante
      return prisma.message.findMany({
        where: { collectionId: parent.id },
        orderBy: { createdAt: 'asc' },
        include: { author: true }
      });
    }
  },

  Feed: {
    articles: async (parent, args, { prisma }) => {
      // Retourne tous les articles de ce flux (sans considérer lu/pas lu car pas de user dans ce contexte)
      return prisma.article.findMany({
        where: { feedId: parent.id },
        orderBy: { published: 'desc' }
      });
    }
  },

  Article: {
    feed: async (parent, args, { prisma }) => {
      return prisma.feed.findUnique({ where: { id: parent.feedId } });
    },
    isRead: async (parent, args, { prisma, user }) => {
      if (!user) return false;
      const status = await prisma.articleStatus.findUnique({
        where: { userId_articleId: { userId: user.id, articleId: parent.id } }
      });
      return status ? status.isRead : false;
    },
    isFavorite: async (parent, args, { prisma, user }) => {
      if (!user) return false;
      const status = await prisma.articleStatus.findUnique({
        where: { userId_articleId: { userId: user.id, articleId: parent.id } }
      });
      return status ? status.isFavorite : false;
    },
    comments: async (parent, args, { prisma, user }) => {
      if (!user) return [];
      // On attend potentiellement dans la requête GraphQL que les commentaires soient filtrés par la collection en contexte.
      // Pour cela, on peut supposer qu'une query article est effectuée via collection.articles -> article.comments.
      // Dans ce cas, la collectionId peut être passée dans args (non standard) ou on peut la connaître via un champ parent fictif.
      // Faute de contexte direct, on retourne tous les commentaires de cet article que l'utilisateur peut voir, i.e. des collections où il est membre.
      const comments = await prisma.comment.findMany({
        where: { articleId: parent.id },
        include: { author: true, collection: true }
      });
      // Ne renvoyer que les commentaires dont l'utilisateur est membre de la collection
      const visibleComments = [];
      for (const comment of comments) {
        const membership = await prisma.collectionMembership.findUnique({
          where: { userId_collectionId: { userId: user.id, collectionId: comment.collectionId } }
        });
        if (membership) {
          visibleComments.push(comment);
        }
      }
      // Trier par date
      visibleComments.sort((a, b) => a.createdAt - b.createdAt);
      return visibleComments;
    }
  },

  Comment: {
    author: (parent) => parent.author
  },

  Message: {
    author: (parent) => parent.author
  },

  Query: {
    me: async (parent, args, { prisma, user }) => {
      if (!user) return null;
      return user; // user est déjà l'objet User récupéré dans le context
    },
    collections: async (parent, args, { prisma, user }) => {
      if (!user) return [];
      // Récupère toutes les collections où l'utilisateur est membre
      const memberships = await prisma.collectionMembership.findMany({
        where: { userId: user.id },
        include: { collection: true }
      });
      // On peut retourner directement les collections
      return memberships.map(m => m.collection);
    },
    collection: async (parent, { id }, { prisma, user }) => {
      if (!user) return null;
      const collectionId = Number(id);
      // Vérifie que user est membre de cette collection
      const membership = await prisma.collectionMembership.findUnique({
        where: { userId_collectionId: { userId: user.id, collectionId: collectionId } }
      });
      if (!membership) {
        throw new Error("Accès refusé à cette collection.");
      }
      // Renvoie la collection (les champs résolveurs complémentaires géreront le reste)
      return prisma.collection.findUnique({ where: { id: collectionId } });
    },
    feeds: async (parent, args, { prisma, user }) => {
      if (!user) return [];
      // Tous les feeds que l'utilisateur suit via ses collections
      // On récupère les collectionFeeds liés aux collections de l'utilisateur
      const memberships = await prisma.collectionMembership.findMany({ where: { userId: user.id } });
      const collectionIds = memberships.map(m => m.collectionId);
      const collectionFeeds = await prisma.collectionFeed.findMany({
        where: { collectionId: { in: collectionIds } },
        include: { feed: true }
      });
      // Filtrer uniques
      const feedsMap = {};
      for (const cf of collectionFeeds) {
        feedsMap[cf.feed.id] = cf.feed;
      }
      return Object.values(feedsMap);
    },
    allTags: async () => {
    const feeds = await Feed.find();
    const tags = new Set();
    feeds.forEach(f => (f.tags || []).forEach(t => tags.add(t)));
    return Array.from(tags);
    },
    allCategories: async () => {
      const feeds = await Feed.find();
      const cats = new Set();
      feeds.forEach(f => (f.categories || []).forEach(c => cats.add(c)));
      return Array.from(cats);
    },
    searchArticles: async (parent, { query }, { prisma, user }) => {
      if (!user) return [];
      if (!query || query.trim() === "") return [];
      // Recherche sur tous les articles des collections de l'utilisateur
      const memberships = await prisma.collectionMembership.findMany({ where: { userId: user.id } });
      const collectionIds = memberships.map(m => m.collectionId);
      const collectionFeeds = await prisma.collectionFeed.findMany({ where: { collectionId: { in: collectionIds } } });
      const feedIds = collectionFeeds.map(cf => cf.feedId);
      if (feedIds.length === 0) return [];
      const term = query;
      const articles = await prisma.article.findMany({
        where: {
          feedId: { in: feedIds },
          OR: [
            { title: { contains: term, mode: 'insensitive' } },
            { content: { contains: term, mode: 'insensitive' } }
          ]
        },
        include: { feed: true }
      });
      // On peut en outre filtrer par pertinence ou autre, mais on se contente de renvoyer les résultats
      return articles;
    },
    allUsers: async (_, __, { user }) => {
      if (!user || user.role !== 'ADMIN') {
        throw new Error('Not authorized');
      }
      return User.find({});
    }
  },

  Mutation: {
    register: async (parent, { email, password, name }, { prisma }) => {
      // Vérifie unicité de l'email
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        throw new Error("Un utilisateur avec cet email existe déjà.");
      }
      const hashed = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          email: email,
          password: hashed,
          name: name,
          darkMode: false,
          fontSize: 'MEDIUM'
        }
      });
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: '2h' }
      );
      return { token, user: {
          id: user.id,
          email: user.email,
          name: user.name,
          darkMode: user.darkMode,
          fontSize: user.fontSize
        } };
    },

    login: async (parent, { email, password }, { prisma }) => {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        throw new Error("Email ou mot de passe incorrect.");
      }
      // Si l'utilisateur est enregistré via OAuth (pas de password), refuser login classique
      if (!user.password) {
        throw new Error("Veuillez vous connecter via OAuth2 pour cet utilisateur.");
      }
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        throw new Error("Email ou mot de passe incorrect.");
      }
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '2h' });
      return { token, user: {
          id: user.id,
          email: user.email,
          name: user.name,
          darkMode: user.darkMode,
          fontSize: user.fontSize
        } };
    },
    updateSettings: async (parent, { darkMode, fontSize }, { prisma, user }) => {
      if (!user) throw new Error("Authentification requise.");
      const data = {};
      if (darkMode !== undefined) data.darkMode = darkMode;
      if (fontSize !== undefined) data.fontSize = fontSize;
      if (Object.keys(data).length === 0) return user;
      const updated = await prisma.user.update({
        where: { id: user.id },
        data
      });
      return updated;
    },
    createCollection: async (parent, { name }, { prisma, user }) => {
      if (!user) throw new Error("Authentification requise.");
      // Crée la collection et l'entrée membership (owner)
      const collection = await prisma.collection.create({
        data: {
          name,
          isShared: false,
          ownerId: user.id,
          memberships: {
            create: {
              userId: user.id,
              role: 'OWNER'
            }
          }
        }
      });
      return collection;
    },
    deleteCollection: async (parent, { id }, { prisma, user }) => {
  if (!user) throw new Error("Authentification requise.");

  const collectionId = Number(id);

  const membership = await prisma.collectionMembership.findUnique({
    where: { userId_collectionId: { userId: user.id, collectionId } }
  });

  if (!membership || membership.role !== 'OWNER') {
    throw new Error("Seul le propriétaire peut supprimer la collection.");
  }

  // Supprime les messages liés
  await prisma.message.deleteMany({ where: { collectionId } });

  // Supprime les commentaires liés à cette collection
  const feedIds = await prisma.collectionFeed.findMany({
    where: { collectionId },
    select: { feedId: true }
  }).then(f => f.map(e => e.feedId));

  await prisma.comment.deleteMany({
    where: {
      article: {
        feedId: { in: feedIds }
      }
    }
  });

  // Supprime les liens collection-feed
  await prisma.collectionFeed.deleteMany({ where: { collectionId } });

  // Supprime les memberships
  await prisma.collectionMembership.deleteMany({ where: { collectionId } });

  // Supprime la collection
  await prisma.collection.delete({ where: { id: collectionId } });

  return true;
},

    addFeed: async (parent, { collectionId, url, title,tags, categories }, { prisma, user }) => {
      if (!user) throw new Error("Authentification requise.");
      const colId = Number(collectionId);
      // Vérifie que user est membre de la collection (et idéalement autorisé à ajouter un feed)
      const membership = await prisma.collectionMembership.findUnique({
        where: { userId_collectionId: { userId: user.id, collectionId: colId } }
      });
      if (!membership) {
        throw new Error("Accès refusé.");
      }
      // Si la collection est partagée, on peut exiger role OWNER pour ajouter un flux
      if (membership.role !== 'OWNER' && membership.role !== 'MEMBER') {
        // (pas d'autre rôle ici, donc inutile)
      }
      // Vérifie si le flux existe déjà en base (globalement)
      let feed = await prisma.feed.findUnique({ where: { url } });
      // Si le feed existe déjà et qu'on passe tags ou categories → on les met à jour
        if (feed && (tags || categories)) {
          feed = await prisma.feed.update({
            where: { id: feed.id },
            data: {
              tags: tags || feed.tags,
              categories: categories || feed.categories
            }
          });
        }

      if (!feed) {
        try {
          const parsed = await parser.parseURL(url);
          feed = await prisma.feed.create({
            data: {
              title: parsed.title || url,
              url,
              description: parsed.description || "",
              tags: tags || [],
              categories: categories || [], 
              status: 'active',
              updateInterval: 60,
              lastFetched: new Date(),
            }
          });
           
          // Insère les articles initiaux du flux
          const items = parsed.items || [];
          for (let item of items) {
            const guid = item.guid || item.id || item.link;
            if (!guid) continue;
            // Convertir la date
            let pubDate = item.isoDate ? new Date(item.isoDate) : (item.pubDate ? new Date(item.pubDate) : new Date());
            try {
              await prisma.article.create({
                data: {
                  feedId: feed.id,
                  title: item.title || "(Sans titre)",
                  link: item.link || "",
                  guid: guid,
                  author: item.creator || item.author || "",
                  content: item.contentSnippet || item.content || "",
                  published: pubDate
                }
              });
            } catch (err) {
              // ignore duplicate article error
              if (err instanceof PrismaClientKnownRequestError) {
                // Code P2002 correspond à violation contrainte unique (unique feedId+guid)
              } else {
                console.error("Erreur insertion article:", err.message);
              }
            }
          }
        } catch (err) {
          console.error("Échec du parsing RSS:", err.message);
          throw new Error("Impossible d'ajouter le flux (URL invalide ou flux inatteignable).");
        }
      }else {
        // Si le feed existe déjà, on peut mettre à jour les tags et catégories
        feed = await prisma.feed.update({
          where: { id: feed.id },
          data: {
            tags: tags || feed.tags,
            categories: categories || feed.categories
          }
        });
      }
      // Maintenant associer ce feed à la collection (sauf si déjà présent)
      try {
        await prisma.collectionFeed.create({
          data: {
            collectionId: colId,
            feedId: feed.id
          }
        });
      } catch (err) {
        // Si contrainte primaire violée, le feed est déjà dans la collection
      }
      // Mettre isShared = true sur la collection si plus d'un membre (optionnel)
      const memberCount = await prisma.collectionMembership.count({ where: { collectionId: colId } });
      if (memberCount > 1) {
        await prisma.collection.update({ where: { id: colId }, 
          data: {       
            tags: tags || [],
            categories: categories || [],} });
      }
      return feed;
    },
updateFeed: async (parent, { feedId, title, tags, categories }, { prisma,user }) => {
  if (!user) throw new Error("Non authentifié");
  const feed = await Feed.findById(feedId).populate('collection');
  if (!feed) throw new Error("Flux introuvable");

  const collection = feed.collection;

  const isOwner = collection.owner.toString() === user.id;
  const isMember = collection.members?.some?.(m => m.user.toString() === user.id && m.privileges.includes('WRITE'));

  if (!isOwner && !isMember) {
    throw new Error("Accès refusé");
  }

  if (title !== undefined) feed.title = title;
  if (tags !== undefined) feed.tags = tags;
  if (categories !== undefined) feed.categories = categories;

  await feed.save();
  return feed;
}
    ,
    removeFeed: async (parent, { collectionId, feedId }, { prisma, user }) => {
      if (!user) throw new Error("Authentification requise.");
      const colId = Number(collectionId);
      const fId = Number(feedId);
      const membership = await prisma.collectionMembership.findUnique({
        where: { userId_collectionId: { userId: user.id, collectionId: colId } }
      });
      if (!membership) throw new Error("Accès refusé.");
      // Si user n'est pas owner, on pourrait refuser la suppression, mais on accepte pour owner.
      if (membership.role !== 'OWNER') {
        // On peut limiter ici, mais pas demandé explicitement.
      }
      // Supprime le lien feed-collection
      await prisma.collectionFeed.delete({
        where: { collectionId_feedId: { collectionId: colId, feedId: fId } }
      });
      return true;
    },
    markArticleRead: async (parent, { articleId, read }, { prisma, user }) => {
      if (!user) throw new Error("Authentification requise.");
      const artId = Number(articleId);
      // Vérifie que l'article existe et que l'utilisateur a accès via l'un de ses feeds
      const article = await prisma.article.findUnique({ where: { id: artId }, include: { feed: true } });
      if (!article) throw new Error("Article introuvable.");
      // Vérifie que feedId est dans l'une des collections de user
      const cf = await prisma.collectionFeed.findFirst({
        where: { feedId: article.feedId, collection: { memberships: { some: { userId: user.id } } } }
      });
      if (!cf) throw new Error("Accès refusé à cet article.");
      // Met à jour ou crée l'état de lecture
      const statusKey = { userId: user.id, articleId: artId };
      let status = await prisma.articleStatus.findUnique({ where: { userId_articleId: statusKey } });
      if (status) {
        if (read) {
          // Marquer comme lu
          status = await prisma.articleStatus.update({
            where: { userId_articleId: statusKey },
            data: { isRead: true }
          });
        } else {
          // Marquer comme non lu -> soit supprimer l'enregistrement si plus favori, soit passer isRead à false
          if (!status.isFavorite) {
            await prisma.articleStatus.delete({ where: { userId_articleId: statusKey } });
            status = null;
          } else {
            status = await prisma.articleStatus.update({
              where: { userId_articleId: statusKey },
              data: { isRead: false }
            });
          }
        }
      } else {
        if (read) {
          // créer l'enregistrement marquant comme lu
          status = await prisma.articleStatus.create({
            data: { userId: user.id, articleId: artId, isRead: true, isFavorite: false }
          });
        } else {
          // déjà non lu par défaut, ne rien faire
        }
      }
      return article;
    },
    markArticleFavorite: async (parent, { articleId, favorite }, { prisma, user }) => {
      if (!user) throw new Error("Authentification requise.");
      const artId = Number(articleId);
      const article = await prisma.article.findUnique({ where: { id: artId }, include: { feed: true } });
      if (!article) throw new Error("Article introuvable.");
      const cf = await prisma.collectionFeed.findFirst({
        where: { feedId: article.feedId, collection: { memberships: { some: { userId: user.id } } } }
      });
      if (!cf) throw new Error("Accès refusé.");
      const statusKey = { userId: user.id, articleId: artId };
      let status = await prisma.articleStatus.findUnique({ where: { userId_articleId: statusKey } });
      if (status) {
        if (favorite) {
          status = await prisma.articleStatus.update({
            where: { userId_articleId: statusKey },
            data: { isFavorite: true }
          });
        } else {
          if (!status.isRead) {
            // Si pas lu et on retire favori -> plus d'état, supprimer
            await prisma.articleStatus.delete({ where: { userId_articleId: statusKey } });
            status = null;
          } else {
            status = await prisma.articleStatus.update({
              where: { userId_articleId: statusKey },
              data: { isFavorite: false }
            });
          }
        }
      } else {
        if (favorite) {
          status = await prisma.articleStatus.create({
            data: { userId: user.id, articleId: artId, isRead: false, isFavorite: true }
          });
        } else {
          // pas favori déjà, ne rien faire
        }
      }
      return article;
    },
    addComment: async (parent, { collectionId, articleId, content }, { prisma, user }) => {
      if (!user) throw new Error("Authentification requise.");
      const colId = Number(collectionId);
      const artId = Number(articleId);
      // Vérifie que l'utilisateur est membre de la collection
      const membership = await prisma.collectionMembership.findUnique({
        where: { userId_collectionId: { userId: user.id, collectionId: colId } }
      });
      if (!membership) throw new Error("Accès refusé.");
      // Vérifie que l'article fait partie des feeds de cette collection
      const cf = await prisma.collectionFeed.findFirst({
        where: { collectionId: colId, feed: { articles: { some: { id: artId } } } }
      });
      if (!cf) throw new Error("Cet article n'appartient pas à cette collection.");
      // Crée le commentaire
      const comment = await prisma.comment.create({
        data: {
          content,
          articleId: artId,
          collectionId: colId,
          authorId: user.id
        },
        include: { author: true }
      });
      return comment;
    },
    addMessage: async (parent, { collectionId, content }, { prisma, user }) => {
      if (!user) throw new Error("Authentification requise.");
      const colId = Number(collectionId);
      // Vérifie que l'utilisateur est membre de la collection
      const membership = await prisma.collectionMembership.findUnique({
        where: { userId_collectionId: { userId: user.id, collectionId: colId } }
      });
      if (!membership) throw new Error("Accès refusé.");
      const message = await prisma.message.create({
        data: {
          content,
          collectionId: colId,
          authorId: user.id
        },
        include: { author: true }
      });
      return message;
    },

      editComment: async (_, { id, content }, { prisma }) => {
        return await prisma.comment.update({
          where: { id: Number(id) },
          data: { content },
        });
      },

      deleteComment: async (_, { id }, { prisma }) => {
        return await prisma.comment.delete({
          where: { id: Number(id) },
        });
      },

changePassword: async (_, { oldPassword, newPassword }, { prisma, user }) => {
  if (!user) throw new Error("Authentification requise.");

  const userInDb = await prisma.user.findUnique({ where: { id: user.id } });
  if (!userInDb || !userInDb.password) throw new Error("Mot de passe introuvable.");

  const valid = await bcrypt.compare(oldPassword, userInDb.password);
  if (!valid) throw new Error("Ancien mot de passe incorrect.");

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed }
  });

  return true;
},

    // Delete own account
    deleteAccount: async (_, __, { prisma, user }) => {
  if (!user) throw new Error("Authentification requise.");
  const userId = user.id;

  // Supprimer les messages de l'utilisateur
  await prisma.message.deleteMany({ where: { authorId: userId } });

  // Supprimer les commentaires de l'utilisateur
  await prisma.comment.deleteMany({ where: { authorId: userId } });

  // Supprimer les statuts d'articles de l'utilisateur
  await prisma.articleStatus.deleteMany({ where: { userId } });

  // Supprimer les appartenances aux collections
  await prisma.collectionMembership.deleteMany({ where: { userId } });

  // Supprimer les collections dont il est propriétaire
  const ownedCollections = await prisma.collection.findMany({
    where: { ownerId: userId }
  });

  for (const col of ownedCollections) {
    const collectionId = col.id;

    // Supprimer les messages associés à la collection
    await prisma.message.deleteMany({ where: { collectionId } });

    // Supprimer les commentaires des articles des feeds liés à la collection
    const feedIds = await prisma.collectionFeed.findMany({
      where: { collectionId },
      select: { feedId: true }
    }).then(r => r.map(f => f.feedId));

    if (feedIds.length > 0) {
      await prisma.comment.deleteMany({
        where: {
          article: {
            feedId: { in: feedIds }
          }
        }
      });
    }

    // Supprimer les liaisons feed <-> collection
    await prisma.collectionFeed.deleteMany({ where: { collectionId } });

    // Supprimer les membres
    await prisma.collectionMembership.deleteMany({ where: { collectionId } });

    // Supprimer la collection elle-même
    await prisma.collection.delete({ where: { id: collectionId } });
  }

  // Supprimer l'utilisateur
  await prisma.user.delete({ where: { id: userId } });

  return true;
},

    deleteUser: async (_, { userId }, { user }) => {
      if (!user || user.role !== 'ADMIN') throw new Error('Not authorized');
      const targetUser = await User.findById(userId);
      if (!targetUser) throw new Error('User not found');
      // Prevent deleting self via this, if desired:
      if (targetUser.id.toString() === user.id.toString()) {
        throw new Error('Admin cannot delete their own account via this');
      }
      // Clean up target user's data similar to deleteAccount
      const uid = targetUser._id;
      const ownedCollections = await Collection.find({ owner: uid });
      for (let coll of ownedCollections) {
        await Feed.deleteMany({ collection: coll._id });
        await Article.deleteMany({ /* remove coll's articles */ });
        await Comment.deleteMany({ /* remove coll's comments if needed */ });
        await Collection.deleteOne({ _id: coll._id });
      }
      await Collection.updateMany(
        { "members.user": uid },
        { $pull: { members: { user: uid } } }
      );
      await Comment.deleteMany({ author: uid });
      await ReadStatus.deleteMany({ user: uid });
      await Favorite.deleteMany({ user: uid });
      await User.deleteOne({ _id: uid });
      return true;
    },
    

    addMember: async (parent, { collectionId, userEmail, role }, { prisma, user }) => {
      if (!user) throw new Error("Authentification requise.");
      const colId = Number(collectionId);
      // Vérifie que user est propriétaire de la collection
      const membership = await prisma.collectionMembership.findUnique({
        where: { userId_collectionId: { userId: user.id, collectionId: colId } }
      });
      if (!membership || membership.role !== 'OWNER') {
        throw new Error("Seul le propriétaire peut ajouter un membre.");
      }
      // Trouve l'utilisateur par email
      const newUser = await prisma.user.findUnique({ where: { email: userEmail } });
      if (!newUser) throw new Error("Utilisateur introuvable pour cet email.");
      // Vérifie si déjà membre
      const existingMember = await prisma.collectionMembership.findUnique({
        where: { userId_collectionId: { userId: newUser.id, collectionId: colId } }
      });
      if (existingMember) throw new Error("Cet utilisateur est déjà membre de la collection.");
      // Ajoute le membre
      const newMember = await prisma.collectionMembership.create({
        data: {
          userId: newUser.id,
          collectionId: colId,
          role: role || 'MEMBER'
        },
        include: { user: true }
      });
      // Marquer la collection comme partagée
      await prisma.collection.update({ where: { id: colId }, data: { isShared: true } });
      return {
        user: newMember.user,
        role: newMember.role
      };
    },
    removeMember: async (parent, { collectionId, userId }, { prisma, user }) => {
      if (!user) throw new Error("Authentification requise.");
      const colId = Number(collectionId);
      const targetUserId = Number(userId);
      // Seul owner peut retirer un membre
      const membership = await prisma.collectionMembership.findUnique({
        where: { userId_collectionId: { userId: user.id, collectionId: colId } }
      });
      if (!membership || membership.role !== 'OWNER') {
        throw new Error("Action non autorisée.");
      }
      // Ne pas permettre de supprimer soi-même si on est owner (sinon collection orpheline)
      if (user.id === targetUserId) {
        throw new Error("Le propriétaire ne peut pas se retirer lui-même.");
      }
      await prisma.collectionMembership.delete({
        where: { userId_collectionId: { userId: targetUserId, collectionId: colId } }
      });
      return true;
    },
    importFeeds: async (parent, { opml }, { prisma, user }) => {
      if (!user) throw new Error("Authentification requise.");
      // Parsage basique de l'OPML (XML) pour extraire les URL de flux
      const feedsAdded = [];
      try {
        const xml2js = require('xml2js');
        let parsed;
        await xml2js.parseStringPromise(opml, { explicitArray: false }, (err, result) => {
          parsed = result;
        });
        if (!parsed) throw new Error("OPML invalide");
        const outlines = parsed.opml.body.outline;
        const feedOutlines = Array.isArray(outlines) ? outlines : [outlines];
        for (let outline of feedOutlines) {
          // Si l'outline a des sous-items
          if (outline.outline) {
            const innerOutlines = Array.isArray(outline.outline) ? outline.outline : [outline.outline];
            for (let sub of innerOutlines) {
              if (sub.$ && sub.$.xmlUrl) {
                feedsAdded.push(sub.$.xmlUrl);
                await resolvers.Mutation.addFeed(null, { collectionId: userDefaultCollectionId, url: sub.$.xmlUrl }, { prisma, user });
              }
            }
          } else if (outline.$ && outline.$.xmlUrl) {
            feedsAdded.push(outline.$.xmlUrl);
            await resolvers.Mutation.addFeed(null, { collectionId: userDefaultCollectionId, url: outline.$.xmlUrl }, { prisma, user });
          }
        }
      } catch (err) {
        console.error("Erreur import OPML:", err.message);
        throw new Error("Échec de l'importation OPML.");
      }
      return true;
    },
    exportFeeds: async (parent, { format }, { prisma, user }) => {
      if (!user) throw new Error("Authentification requise.");
      const memberships = await prisma.collectionMembership.findMany({
        where: { userId: user.id },
        include: { collection: { include: { collectionFeeds: { include: { feed: true } } } } }
      });
      // Rassemble tous les feeds distincts de l'utilisateur
      const allFeeds = {};
      for (let m of memberships) {
        for (let cf of m.collection.collectionFeeds) {
          allFeeds[cf.feedId] = cf.feed;
        }
      }
      const feeds = Object.values(allFeeds);
      format = format.toLowerCase();
      if (format === 'opml') {
        // Génère un OPML avec les feeds
        let opml = `<?xml version="1.0" encoding="UTF-8"?>\n<opml version="2.0">\n<head>\n<title>Subscriptions</title>\n</head>\n<body>\n`;
        for (let feed of feeds) {
          opml += `<outline text="${feed.title}" type="rss" xmlUrl="${feed.url}" htmlUrl="" />\n`;
        }
        opml += `</body>\n</opml>`;
        return opml;
      } else if (format === 'json') {
        return JSON.stringify(feeds.map(f => ({ title: f.title, url: f.url, tags: f.tags })), null, 2);
      } else if (format === 'csv') {
        let csv = "Title,URL,Tags\n";
        for (let f of feeds) {
          csv += `"${f.title.replace(/"/g, '""')}",${f.url},"${(f.tags || []).join(',')}"\n`;
        }
        return csv;
      } else {
        throw new Error("Format non supporté. Utilisez 'opml', 'json' ou 'csv'.");
      }
    }
  }
};

module.exports = { resolvers };
