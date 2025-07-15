const { gql } = require('apollo-server-express');

const typeDefs = gql`
  scalar DateTime

  enum Role {
    OWNER
    MEMBER
  }

  enum FontSize {
    SMALL
    MEDIUM
    LARGE
  }

  type User {
    id: ID!
    email: String!
    name: String
    darkMode: Boolean!
    fontSize: FontSize!
    collections: [Collection!]!    # Collections dont l'utilisateur est membre
  }

  type Account {
    id: ID!
    provider: String!
    providerAccountId: String!
    user: User!
  }

  type Collection {
    id: ID!
    name: String!
    isShared: Boolean!
    owner: User
    feeds: [Feed!]!                # Flux RSS dans cette collection
    members: [CollectionMember!]!  # Membres de la collection (avec rôles)
    articles(
      feedId: ID,
      unread: Boolean,
      favorite: Boolean,
      tag: String,
      search: String
    ): [Article!]!                 # Articles des flux de la collection (optionnellement filtrés)
    messages: [Message!]!          # Messages de la collection (chat interne)
  }

  type CollectionMember {
    user: User!
    role: Role!
  }

  type Feed {
    id: ID!
    title: String!
    url: String!
    description: String
    tags: [String!]!
    status: String!
    updateInterval: Int!
    lastFetched: DateTime
    articles: [Article!]!         # Tous les articles du flux (non filtré par utilisateur)
  }

  type Article {
    id: ID!
    feed: Feed!
    title: String!
    link: String!
    author: String
    content: String
    published: DateTime!
    isRead: Boolean!              # Indique si l'article est marqué comme lu par l'utilisateur courant
    isFavorite: Boolean!          # Indique si l'article est marqué favori par l'utilisateur courant
    comments: [Comment!]!        # Commentaires sur cet article dans le contexte de la collection consultée
  }

  type Comment {
    id: ID!
    author: User!
    content: String!
    createdAt: DateTime!
  }

  type Message {
    id: ID!
    author: User!
    content: String!
    createdAt: DateTime!
  }

  type Query {
    me: User
    collections: [Collection!]!             # Collections de l'utilisateur connecté
    collection(id: ID!): Collection
    feeds: [Feed!]!                         # Tous les flux suivis par l'utilisateur (tous collections confondues)
    searchArticles(query: String!): [Article!]!   # Recherche plein texte globale dans les titres/contenus
  }

  type Mutation {
    register(email: String!, password: String!, name: String): AuthPayload
    login(email: String!, password: String!): AuthPayload
    updateSettings(darkMode: Boolean, fontSize: FontSize): User!

    createCollection(name: String!): Collection!
    deleteCollection(id: ID!): Boolean!

    addFeed(collectionId: ID!, url: String!): Feed!
    removeFeed(collectionId: ID!, feedId: ID!): Boolean!

    markArticleRead(articleId: ID!, read: Boolean!): Article!
    markArticleFavorite(articleId: ID!, favorite: Boolean!): Article!

    addComment(collectionId: ID!, articleId: ID!, content: String!): Comment!
    addMessage(collectionId: ID!, content: String!): Message!

    addMember(collectionId: ID!, userEmail: String!, role: Role = MEMBER): CollectionMember!
    removeMember(collectionId: ID!, userId: ID!): Boolean!

    importFeeds(opml: String!): Boolean!      # Importer des flux depuis un texte OPML
    exportFeeds(format: String!): String!     # Exporter les abonnements (format: "opml", "json", "csv")
  }

  type AuthPayload {
    token: String
    user: User
  }
`;

module.exports = { typeDefs };
