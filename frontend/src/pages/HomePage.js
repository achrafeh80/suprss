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
  mutation AddMember($collectionId: ID!, $userEmail: String!, $role: Role) {
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
  const [addMember] = useMutation(ADD_MEMBER, {
    onCompleted: (data) => {
      alert(`Membre ajouté : ${data.addMember.user.email}`);
      refetchCols();
      setNewMemberEmail("");
      setNewMemberRole("MEMBER");
    },
    onError: (err) => {
      alert("Erreur : " + err.message);
    }
  });  
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
    if (!newMemberEmail.trim()) {
      alert("Veuillez saisir un email.");
      return;
    }
    if (!selectedCollection) {
      alert("Veuillez sélectionner une collection.");
      return;
    }
    addMember({
      variables: {
        collectionId: selectedCollection,
        userEmail: newMemberEmail,
        role: newMemberRole
      }
    });
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

  if (loadingCols) return <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '18px',
    color: '#666'
  }}>Chargement collections...</div>;
  
  if (loadingArts) return <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '18px',
    color: '#666'
  }}>Chargement articles...</div>;

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      height: '100vh',
      backgroundColor: '#f8fafc',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <header style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{
          margin: 0,
          fontSize: '2rem',
          fontWeight: '700',
          letterSpacing: '0.1em'
        }}>SUPRSS</h1>
        <button 
          onClick={() => navigate("/settings")}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontSize: '14px'
          }}
          onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
          onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
        >
          ⚙️ Paramètres
        </button>
      </header>

      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden'
      }}>
        {/* SIDEBAR */}
        <aside style={{
          width: '350px',
          backgroundColor: 'white',
          borderRight: '1px solid #e2e8f0',
          padding: '1.5rem',
          overflowY: 'auto',
          boxShadow: '2px 0 10px rgba(0,0,0,0.05)'
        }}>
          <h2 style={{
            color: '#2d3748',
            fontSize: '1.25rem',
            fontWeight: '600',
            marginBottom: '1rem',
            borderBottom: '2px solid #667eea',
            paddingBottom: '0.5rem'
          }}>Collections</h2>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <input
              placeholder="Nouvelle collection"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                marginBottom: '0.5rem',
                outline: 'none',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
            <button 
              onClick={handleCreateCollection}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                padding: '0.75rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'transform 0.2s ease'
              }}
              onMouseOver={(e) => e.target.style.transform = 'translateY(-1px)'}
              onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
            >
              ➕ Créer
            </button>
          </div>

          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {collectionsData.collections.map((col) => (
              <li key={col.id} style={{
                marginBottom: '0.5rem',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                backgroundColor: col.id === selectedCollection ? '#f7fafc' : 'white',
                transition: 'all 0.2s ease'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.75rem'
                }}>
                  <button 
                    onClick={() => setSelectedCollection(col.id)}
                    style={{
                      flex: 1,
                      background: 'none',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: col.id === selectedCollection ? '600' : '400',
                      color: col.id === selectedCollection ? '#667eea' : '#2d3748'
                    }}
                  >
                    {col.name} {col.isShared ? "👥" : ""}
                  </button>
                  <button 
                    onClick={() => handleDeleteCollection(col.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      borderRadius: '4px',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#fed7d7'}
                    onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    🗑️
                  </button>
                </div>
                
                {/* FEEDS */}
                {col.id === selectedCollection && (
                  <div style={{
                    borderTop: '1px solid #e2e8f0',
                    padding: '1rem',
                    backgroundColor: '#f8fafc'
                  }}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem 0' }}>
                      <li style={{
                        padding: '0.5rem',
                        borderRadius: '6px',
                        backgroundColor: !selectedFeed ? '#667eea' : 'transparent',
                        color: !selectedFeed ? 'white' : '#4a5568',
                        marginBottom: '0.25rem'
                      }}>
                        <button 
                          onClick={() => setSelectedFeed(null)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'inherit',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '500'
                          }}
                        >
                          Tous les articles
                        </button>
                      </li>
                      {col.feeds.map((feed) => (
                        <li key={feed.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0.5rem',
                          borderRadius: '6px',
                          backgroundColor: feed.id === selectedFeed ? '#667eea' : 'transparent',
                          color: feed.id === selectedFeed ? 'white' : '#4a5568',
                          marginBottom: '0.25rem'
                        }}>
                          <button 
                            onClick={() => setSelectedFeed(feed.id)}
                            style={{
                              flex: 1,
                              background: 'none',
                              border: 'none',
                              textAlign: 'left',
                              color: 'inherit',
                              cursor: 'pointer',
                              fontSize: '13px'
                            }}
                          >
                            {feed.title}
                          </button>
                          <button 
                            onClick={() => handleRemoveFeed(feed.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '0.25rem',
                              borderRadius: '4px',
                              opacity: 0.7
                            }}
                          >
                            🗑️
                          </button>
                        </li>
                      ))}
                    </ul>
                    
                    <div style={{ marginBottom: '1.5rem' }}>
                      <input
                        placeholder="URL RSS"
                        value={newFeedUrl}
                        onChange={(e) => setNewFeedUrl(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          fontSize: '13px',
                          marginBottom: '0.5rem',
                          outline: 'none'
                        }}
                      />
                      <button 
                        onClick={handleAddFeed}
                        style={{
                          width: '100%',
                          background: '#48bb78',
                          color: 'white',
                          border: 'none',
                          padding: '0.5rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '500'
                        }}
                      >
                        Ajouter flux
                      </button>
                    </div>
                    
                    <h4 style={{
                      color: '#2d3748',
                      fontSize: '14px',
                      fontWeight: '600',
                      marginBottom: '0.5rem'
                    }}>Membres</h4>
                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem 0' }}>
                      {col.members.map((m) => (
                        <li key={m.user.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.5rem',
                          backgroundColor: '#e2e8f0',
                          borderRadius: '6px',
                          marginBottom: '0.25rem',
                          fontSize: '13px'
                        }}>
                          <span>{m.user.name} ({m.role})</span>
                          <button 
                            onClick={() => handleRemoveMember(m.user.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '0.25rem'
                            }}
                          >
                            ❌
                          </button>
                        </li>
                      ))}
                    </ul>
                    
                    <div style={{ marginBottom: '1.5rem' }}>
                      <input
                        placeholder="Email membre"
                        value={newMemberEmail}
                        onChange={(e) => setNewMemberEmail(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          fontSize: '13px',
                          marginBottom: '0.5rem',
                          outline: 'none'
                        }}
                      />
                      <select 
                        value={newMemberRole} 
                        onChange={(e) => setNewMemberRole(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          fontSize: '13px',
                          marginBottom: '0.5rem',
                          outline: 'none'
                        }}
                      >
                        <option value="OWNER">OWNER</option>
                        <option value="MEMBER">MEMBER</option>
                      </select>
                      <button 
                        onClick={handleAddMember}
                        style={{
                          width: '100%',
                          background: '#4299e1',
                          color: 'white',
                          border: 'none',
                          padding: '0.5rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '500'
                        }}
                      >
                        Inviter membre
                      </button>
                    </div>

                    <h4 style={{
                      color: '#2d3748',
                      fontSize: '14px',
                      fontWeight: '600',
                      marginBottom: '0.5rem'
                    }}>Chat</h4>
                    <ul style={{ 
                      listStyle: 'none', 
                      padding: 0, 
                      margin: '0 0 1rem 0',
                      maxHeight: '120px',
                      overflowY: 'auto',
                      backgroundColor: '#f7fafc',
                      borderRadius: '6px',
                      padding: '0.5rem'
                    }}>
                      {col.messages.map((msg) => (
                        <li key={msg.id} style={{
                          marginBottom: '0.5rem',
                          fontSize: '13px',
                          lineHeight: '1.4'
                        }}>
                          <b style={{ color: '#667eea' }}>{msg.author.name}:</b> {msg.content}
                        </li>
                      ))}
                    </ul>
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Votre message"
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '13px',
                        marginBottom: '0.5rem',
                        outline: 'none',
                        resize: 'vertical',
                        minHeight: '60px'
                      }}
                    />
                    <button 
                      onClick={handleAddMessage}
                      style={{
                        width: '100%',
                        background: '#38a169',
                        color: 'white',
                        border: 'none',
                        padding: '0.5rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500'
                      }}
                    >
                      Envoyer
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>

          <div style={{
            marginTop: '2rem',
            padding: '1rem',
            backgroundColor: '#f7fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            <h3 style={{
              color: '#2d3748',
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '0.75rem'
            }}>Export Feeds</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button 
                onClick={() => handleExport("opml")}
                style={{
                  background: '#ed8936',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500'
                }}
              >
                Export OPML
              </button>
              <button 
                onClick={() => handleExport("json")}
                style={{
                  background: '#38a169',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500'
                }}
              >
                Export JSON
              </button>
              <button 
                onClick={() => handleExport("csv")}
                style={{
                  background: '#3182ce',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500'
                }}
              >
                Export CSV
              </button>
            </div>
          </div>
        </aside>

        {/* ARTICLES */}
        <section style={{
          flex: 1,
          padding: '2rem',
          overflowY: 'auto'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '2rem',
            gap: '1rem'
          }}>
            <input
              placeholder="Recherche..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                border: '2px solid #e2e8f0',
                borderRadius: '25px',
                fontSize: '16px',
                outline: 'none',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
            <button 
              onClick={handleSearch}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '25px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '500',
                transition: 'transform 0.2s ease'
              }}
              onMouseOver={(e) => e.target.style.transform = 'translateY(-1px)'}
              onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
            >
              🔎
            </button>
          </div>

          {articlesData && articlesData.collection && (
            <>
              <h2 style={{
                color: '#2d3748',
                fontSize: '1.5rem',
                fontWeight: '600',
                marginBottom: '1.5rem',
                borderBottom: '2px solid #667eea',
                paddingBottom: '0.5rem'
              }}>
                Articles – {articlesData.collection.name}
              </h2>
              
              <div style={{
                display: 'grid',
                gap: '1.5rem'
              }}>
                {articlesData.collection.articles.map((article) => (
                  <div key={article.id} style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                  }}
                  >
                    <div style={{ marginBottom: '1rem' }}>
                      <h3 style={{
                        color: '#2d3748',
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        marginBottom: '0.5rem',
                        lineHeight: '1.4'
                      }}>
                        {article.title}
                      </h3>
                                              <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        color: '#718096',
                        fontSize: '14px'
                      }}>
                        <span style={{
                          background: '#667eea',
                          color: 'white',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          {article.feed.title}
                        </span>
                        <span>{new Date(article.published).toLocaleString()}</span>
                      </div>
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      gap: '0.75rem',
                      marginBottom: '1.5rem'
                    }}>
                      <button 
                        onClick={() => markRead({ variables: { articleId: article.id, read: !article.isRead } })}
                        style={{
                          background: article.isRead ? '#e2e8f0' : '#48bb78',
                          color: article.isRead ? '#4a5568' : 'white',
                          border: 'none',
                          padding: '0.5rem 1rem',
                          borderRadius: '20px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '500',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-1px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                      >
                        {article.isRead ? "Marquer non lu" : "Marquer lu"}
                      </button>
                      <button 
                        onClick={() => markFav({ variables: { articleId: article.id, fav: !article.isFavorite } })}
                        style={{
                          background: article.isFavorite ? '#f6e05e' : '#e2e8f0',
                          color: article.isFavorite ? '#744210' : '#4a5568',
                          border: 'none',
                          padding: '0.5rem 1rem',
                          borderRadius: '20px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '500',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-1px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                      >
                        {article.isFavorite ? "★ Retirer favori" : "☆ Favori"}
                      </button>
                    </div>
                    
                    <div style={{
                      borderTop: '1px solid #e2e8f0',
                      paddingTop: '1rem'
                    }}>
                      <h4 style={{
                        color: '#2d3748',
                        fontSize: '16px',
                        fontWeight: '600',
                        marginBottom: '0.75rem'
                      }}>Commentaires</h4>
                      
                      <div style={{
                        marginBottom: '1rem',
                        maxHeight: '150px',
                        overflowY: 'auto'
                      }}>
                        {article.comments.map((c) => (
                          <div key={c.id} style={{
                            backgroundColor: '#f7fafc',
                            padding: '0.75rem',
                            borderRadius: '8px',
                            marginBottom: '0.5rem',
                            border: '1px solid #e2e8f0'
                          }}>
                            <div style={{
                              fontSize: '13px',
                              lineHeight: '1.4'
                            }}>
                              <span style={{ 
                                fontWeight: '600', 
                                color: '#667eea',
                                marginRight: '0.5rem'
                              }}>
                                {c.author.name}:
                              </span>
                              <span style={{ color: '#4a5568' }}>
                                {c.content}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        gap: '0.75rem',
                        alignItems: 'flex-end'
                      }}>
                        <textarea
                          placeholder="Ajouter un commentaire"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          style={{
                            flex: 1,
                            padding: '0.75rem',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '14px',
                            outline: 'none',
                            resize: 'vertical',
                            minHeight: '60px',
                            transition: 'border-color 0.2s ease'
                          }}
                          onFocus={(e) => e.target.style.borderColor = '#667eea'}
                          onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                        />
                        <button 
                          onClick={() => handleAddComment(article.id)}
                          style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            transition: 'transform 0.2s ease',
                            whiteSpace: 'nowrap'
                          }}
                          onMouseOver={(e) => e.target.style.transform = 'translateY(-1px)'}
                          onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                        >
                          Commenter
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default HomePage;