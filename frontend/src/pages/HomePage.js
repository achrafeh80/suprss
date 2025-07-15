// chemin : ./frontend/src/pages/HomePage.js
import React, { useEffect, useState } from 'react';
import { useQuery, gql, useMutation } from '@apollo/client';
import { Link, useNavigate } from 'react-router-dom';

const GET_COLLECTIONS = gql`
  query GetCollections {
    collections {
      id
      name
      isShared
      feeds { id title }
    }
  }
`;

const GET_ARTICLES = gql`
  query GetArticles($collectionId: ID!, $feedId: ID) {
    collection(id: $collectionId) {
      id
      name
      articles(feedId: $feedId) {
        id
        title
        published
        feed { title }
        isRead
        isFavorite
      }
    }
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

function HomePage({ theme, setTheme }) {
  const navigate = useNavigate();
  const { data: collectionsData, loading: loadingCols } = useQuery(GET_COLLECTIONS);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [selectedFeed, setSelectedFeed] = useState(null);
  const { data: articlesData, refetch: refetchArticles } = useQuery(GET_ARTICLES, {
    variables: { collectionId: selectedCollection || "", feedId: selectedFeed },
    skip: !selectedCollection
  });
  const [markRead] = useMutation(MARK_READ_MUTATION);
  const [markFav] = useMutation(MARK_FAV_MUTATION);

  useEffect(() => {
    if (collectionsData && collectionsData.collections.length > 0 && !selectedCollection) {
      // Sélectionner la première collection par défaut
      setSelectedCollection(collectionsData.collections[0].id);
    }
  }, [collectionsData, selectedCollection]);

  const handleSelectCollection = (id) => {
    setSelectedCollection(id);
    setSelectedFeed(null);
  };

  const handleSelectFeed = (id) => {
    setSelectedFeed(id);
    // On refait la requête articles avec feedId
    refetchArticles({ collectionId: selectedCollection, feedId: id });
  };

  const toggleRead = async (article) => {
    await markRead({ variables: { articleId: article.id, read: !article.isRead } });
    refetchArticles();
  };

  const toggleFavorite = async (article) => {
    await markFav({ variables: { articleId: article.id, fav: !article.isFavorite } });
    refetchArticles();
  };

  if (loadingCols) return <div>Chargement...</div>;

  return (
    <div className="app-layout">
      {/* Barre de navigation */}
      <header className="top-bar">
        <h1>SUPRSS</h1>
        <div>
          <button onClick={() => navigate('/settings')}>⚙️ Paramètres</button>
        </div>
      </header>
      {/* Contenu principal avec sidebar + liste articles */}
      <div className="main-section">
        <aside className="sidebar">
          <h2>Collections</h2>
          <ul>
            {collectionsData.collections.map(col => (
              <li key={col.id} className={col.id === selectedCollection ? 'active' : ''}>
                <button onClick={() => handleSelectCollection(col.id)}>
                  {col.name} {col.isShared ? '👥' : ''}
                </button>
                {/* Liste des feeds de cette collection (affichée si collection active) */}
                {col.id === selectedCollection && (
                  <ul className="feed-list">
                    <li className={!selectedFeed ? 'active': ''}>
                      <button onClick={() => handleSelectFeed(null)}>Tous les articles</button>
                    </li>
                    {col.feeds.map(feed => (
                      <li key={feed.id} className={feed.id === selectedFeed ? 'active' : ''}>
                        <button onClick={() => handleSelectFeed(feed.id)}>{feed.title}</button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </aside>
        <section className="article-section">
          {articlesData && articlesData.collection ? (
            <>
              <h2>Articles – {articlesData.collection.name}</h2>
              <ul className="article-list">
                {articlesData.collection.articles.map(article => (
                  <li key={article.id} className={`article-item ${article.isRead ? 'read' : 'unread'}`}>
                    <div className="article-meta">
                      <span className="article-title">{article.title}</span>
                      <span className="article-feed">[{article.feed.title}]</span>
                      <span className="article-date">{new Date(article.published).toLocaleString()}</span>
                    </div>
                    <div className="article-actions">
                      <button onClick={() => toggleRead(article)}>
                        {article.isRead ? 'Marquer non lu' : 'Marquer lu'}
                      </button>
                      <button onClick={() => toggleFavorite(article)}>
                        {article.isFavorite ? '★ Retirer favori' : '☆ Favori'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p>Aucune collection sélectionnée.</p>
          )}
        </section>
      </div>
    </div>
  );
}

export default HomePage;
