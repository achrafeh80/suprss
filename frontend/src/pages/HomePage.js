// chemin : ./frontend/src/pages/HomePage.js
import React, { useEffect, useState } from 'react';
import { useQuery, gql, useMutation } from '@apollo/client';
import { Link, useNavigate } from 'react-router-dom';

// ----------------------
// GraphQL Queries
// ----------------------

const GET_COLLECTIONS = gql`
  query GetCollections {
    collections {
      id
      name
      isShared
      feeds { id title }
      members {
        user { id email name }
        role
      }
      messages {
        id
        content
        author { id name }
        createdAt
      }
    }
  }
`;

const GET_ARTICLES = gql`
  query GetArticles(
    $collectionId: ID!,
    $feedId: ID,
    $tag: String,
    $unread: Boolean,
    $favorite: Boolean,
    $search: String
  ) {
    collection(id: $collectionId) {
      id
      name
      articles(
        feedId: $feedId,
        tag: $tag,
        unread: $unread,
        favorite: $favorite,
        search: $search
      ) {
        id
        title
        published
        feed { title }
        isRead
        isFavorite
        comments {
          id
          content
          author { name }
        }
      }
    }
  }
`;

const SEARCH_ARTICLES = gql`
  query SearchArticles($query: String!) {
    searchArticles(query: $query) {
      id
      title
      published
      feed { title }
      isRead
      isFavorite
    }
  }
`;

// ----------------------
// GraphQL Mutations
// ----------------------

const CREATE_COLLECTION = gql`
  mutation CreateCollection($name: String!) {
    createCollection(name: $name) {
      id
      name
    }
  }
`;

const DELETE_COLLECTION = gql`
  mutation DeleteCollection($id: ID!) {
    deleteCollection(id: $id)
  }
`;

const ADD_FEED = gql`
  mutation AddFeed($collectionId: ID!, $url: String!) {
    addFeed(collectionId: $collectionId, url: $url) {
      id
      title
    }
  }
`;

const REMOVE_FEED = gql`
  mutation RemoveFeed($collectionId: ID!, $feedId: ID!) {
    removeFeed(collectionId: $collectionId, feedId: $feedId)
  }
`;

const MARK_READ_MUTATION = gql`
  mutation MarkRead($articleId: ID!, $read: Boolean!) {
    markArticleRead(articleId: $articleId, read: $read) {
      id
    }
  }
`;

const MARK_FAV_MUTATION = gql`
  mutation MarkFavorite($articleId: ID!, $fav: Boolean!) {
    markArticleFavorite(articleId: $articleId, favorite: $fav) {
      id
    }
  }
`;

const ADD_COMMENT = gql`
  mutation AddComment($collectionId: ID!, $articleId: ID!, $content: String!) {
    addComment(collectionId: $collectionId, articleId: $articleId, content: $content) {
      id
      content
      author { name }
    }
  }
`;

const ADD_MESSAGE = gql`
  mutation AddMessage($collectionId: ID!, $content: String!) {
    addMessage(collectionId: $collectionId, content: $content) {
      id
      content
      author { name }
    }
  }
`;

const ADD_MEMBER = gql`
  mutation AddMember($collectionId: ID!, $userEmail: String!, $role: String!) {
    addMember(collectionId: $collectionId, userEmail: $userEmail, role: $role) {
      user { id email name }
      role
    }
  }
`;

const REMOVE_MEMBER = gql`
  mutation RemoveMember($collectionId: ID!, $userId: ID!) {
    removeMember(collectionId: $collectionId, userId: $userId)
  }
`;

const EXPORT_FEEDS = gql`
  mutation ExportFeeds($format: String!) {
    exportFeeds(format: $format)
  }
`;

// ----------------------
// React Component
// ----------------------

function HomePage({ theme, setTheme }) {
  const navigate = useNavigate();

  // State
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [selectedFeed, setSelectedFeed] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [articleFilters, setArticleFilters] = useState({});
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [newComment, setNewComment] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("MEMBER");

  // Queries
  const { data: collectionsData, loading: loadingCols, refetch: refetchCols } = useQuery(GET_COLLECTIONS);
  const { data: articlesData, loading: loadingArts, refetch: refetchArticles } = useQuery(GET_ARTICLES, {
    variables: {
      collectionId: selectedCollection || "",
      feedId: selectedFeed,
      ...articleFilters,
      search: searchQuery || undefined
    },
    skip: !selectedCollection
  });

  // Mutations
  const [createCollection] = useMutation(CREATE_COLLECTION, { onCompleted: () => refetchCols() });
  const [deleteCollection] = useMutation(DELETE_COLLECTION, { onCompleted: () => refetchCols() });
  const [addFeed] = useMutation(ADD_FEED, { onCompleted: () => refetchCols() });
  const [removeFeed] = useMutation(REMOVE_FEED, { onCompleted: () => refetchCols() });
  const [markRead] = useMutation(MARK_READ_MUTATION, { onCompleted: () => refetchArticles() });
  const [markFav] = useMutation(MARK_FAV_MUTATION, { onCompleted: () => refetchArticles() });
  const [addComment] = useMutation(ADD_COMMENT, { onCompleted: () => refetchArticles() });
  const [addMessage] = useMutation(ADD_MESSAGE, { onCompleted: () => refetchCols() });
  const [addMember] = useMutation(ADD_MEMBER, { onCompleted: () => refetchCols() });
  const [removeMember] = useMutation(REMOVE_MEMBER, { onCompleted: () => refetchCols() });
  const [exportFeeds] = useMutation(EXPORT_FEEDS);

  // Handlers
  const handleCreateCollection = () => {
    if (newCollectionName.trim()) {
      createCollection({ variables: { name: newCollectionName } });
      setNewCollectionName("");
    }
  };

  const handleDeleteCollection = (id) => {
    deleteCollection({ variables: { id } });
  };

  const handleAddFeed = () => {
    if (newFeedUrl.trim() && selectedCollection) {
      addFeed({ variables: { collectionId: selectedCollection, url: newFeedUrl } });
      setNewFeedUrl("");
    }
  };

  const handleRemoveFeed = (feedId) => {
    if (selectedCollection) {
      removeFeed({ variables: { collectionId: selectedCollection, feedId } });
    }
  };

  const handleAddComment = (articleId) => {
    if (newComment.trim()) {
      addComment({ variables: { collectionId: selectedCollection, articleId, content: newComment } });
      setNewComment("");
    }
  };

  const handleAddMessage = () => {
    if (newMessage.trim()) {
      addMessage({ variables: { collectionId: selectedCollection, content: newMessage } });
      setNewMessage("");
    }
  };

  const handleAddMember = () => {
    if (newMemberEmail.trim()) {
      addMember({
        variables: {
          collectionId: selectedCollection,
          userEmail: newMemberEmail,
          role: newMemberRole
        }
      });
      setNewMemberEmail("");
      setNewMemberRole("MEMBER");
    }
  };

  const handleRemoveMember = (userId) => {
    removeMember({
      variables: { collectionId: selectedCollection, userId }
    });
  };

  const handleExport = async (format) => {
    const { data } = await exportFeeds({ variables: { format } });
    const blob = new Blob([data.exportFeeds], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `feeds.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSearch = () => {
    refetchArticles();
  };

  if (loadingCols) return <div>Chargement collections...</div>;
  if (loadingArts) return <div>Chargement articles...</div>;

  return (
    <div className="app-layout">
      <header className="top-bar">
        <h1>SUPRSS</h1>
        <button onClick={() => navigate("/settings")}>⚙️ Paramètres</button>
      </header>

      <div className="main-section">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <h2>Collections</h2>
          <input
            placeholder="Nouvelle collection"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
          />
          <button onClick={handleCreateCollection}>➕ Créer</button>

          <ul>
            {collectionsData.collections.map((col) => (
              <li key={col.id} className={col.id === selectedCollection ? "active" : ""}>
                <button onClick={() => setSelectedCollection(col.id)}>
                  {col.name} {col.isShared ? "👥" : ""}
                </button>
                <button onClick={() => handleDeleteCollection(col.id)}>🗑️</button>
                {/* FEEDS */}
                {col.id === selectedCollection && (
                  <>
                    <ul className="feed-list">
                      <li className={!selectedFeed ? "active" : ""}>
                        <button onClick={() => setSelectedFeed(null)}>Tous les articles</button>
                      </li>
                      {col.feeds.map((feed) => (
                        <li key={feed.id} className={feed.id === selectedFeed ? "active" : ""}>
                          <button onClick={() => setSelectedFeed(feed.id)}>
                            {feed.title}
                          </button>
                          <button onClick={() => handleRemoveFeed(feed.id)}>🗑️</button>
                        </li>
                      ))}
                    </ul>
                    <input
                      placeholder="URL RSS"
                      value={newFeedUrl}
                      onChange={(e) => setNewFeedUrl(e.target.value)}
                    />
                    <button onClick={handleAddFeed}>Ajouter flux</button>
                    <h4>Membres</h4>
                    <ul>
                      {col.members.map((m) => (
                        <li key={m.user.id}>
                          {m.user.name} ({m.role})
                          <button onClick={() => handleRemoveMember(m.user.id)}>❌</button>
                        </li>
                      ))}
                    </ul>
                    <input
                      placeholder="Email membre"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                    />
                    <select value={newMemberRole} onChange={(e) => setNewMemberRole(e.target.value)}>
                      <option value="OWNER">OWNER</option>
                      <option value="MEMBER">MEMBER</option>
                    </select>
                    <button onClick={handleAddMember}>Inviter membre</button>

                    <h4>Chat</h4>
                    <ul>
                      {col.messages.map((msg) => (
                        <li key={msg.id}>
                          <b>{msg.author.name}:</b> {msg.content}
                        </li>
                      ))}
                    </ul>
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Votre message"
                    ></textarea>
                    <button onClick={handleAddMessage}>Envoyer</button>
                  </>
                )}
              </li>
            ))}
          </ul>

          <h3>Export Feeds</h3>
          <button onClick={() => handleExport("opml")}>Export OPML</button>
          <button onClick={() => handleExport("json")}>Export JSON</button>
          <button onClick={() => handleExport("csv")}>Export CSV</button>
        </aside>

        {/* ARTICLES */}
        <section className="article-section">
          <div>
            <input
              placeholder="Recherche..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button onClick={handleSearch}>🔎</button>
          </div>

          {articlesData && articlesData.collection && (
            <>
              <h2>Articles – {articlesData.collection.name}</h2>
              <ul className="article-list">
                {articlesData.collection.articles.map((article) => (
                  <li key={article.id}>
                    <div>
                      <strong>{article.title}</strong> ({article.feed.title})<br />
                      {new Date(article.published).toLocaleString()}
                    </div>
                    <div>
                      <button onClick={() => markRead({ variables: { articleId: article.id, read: !article.isRead } })}>
                        {article.isRead ? "Marquer non lu" : "Marquer lu"}
                      </button>
                      <button onClick={() => markFav({ variables: { articleId: article.id, fav: !article.isFavorite } })}>
                        {article.isFavorite ? "★ Retirer favori" : "☆ Favori"}
                      </button>
                    </div>
                    <div>
                      <h4>Commentaires</h4>
                      <ul>
                        {article.comments.map((c) => (
                          <li key={c.id}>
                            <b>{c.author.name}:</b> {c.content}
                          </li>
                        ))}
                      </ul>
                      <textarea
                        placeholder="Ajouter un commentaire"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                      ></textarea>
                      <button onClick={() => handleAddComment(article.id)}>Commenter</button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default HomePage;
