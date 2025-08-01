// chemin : ./frontend/src/pages/HomePage.js
import React, { useEffect, useState } from 'react';
import { useQuery, gql, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';

// ----------------------
// GraphQL Queries
// ----------------------

const GET_COLLECTIONS = gql`
  query GetCollections {
    collections {
      id
      name
      isShared
      feeds { id title tags categories}
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
        link
        author
        content
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

const ME_QUERY = gql`
  query Me {
    me {
      id
      email
      name
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
  mutation AddFeed($collectionId: ID!, $url: String!, $title: String, $tags: [String!], $categories: [String!]) {
    addFeed(collectionId: $collectionId, url: $url, title: $title, tags: $tags, categories: $categories) {
      id
      title
      tags
      categories
    }
  }
`;

const UPDATE_FEED = gql`
  mutation UpdateFeed($feedId: ID!, $title: String, $tags: [String!], $categories: [String!]) {
    updateFeed(feedId: $feedId, title: $title, tags: $tags, categories: $categories) {
      id
      title
      tags
      categories
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

const EDIT_COMMENT = gql`
  mutation EditComment($id: Int!, $content: String!) {
    editComment(id: $id, content: $content) {
      id
      content
    }
  }
`;

const DELETE_COMMENT = gql`
  mutation DeleteComment($id: Int!) {
    deleteComment(id: $id) {
      id
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
const GET_TAGS = gql`query { allTags }`;
const GET_CATEGORIES = gql`query { allCategories }`;

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
  const [collections, setCollections] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [errorMessage, setErrorMessage] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [newMessage, setNewMessage] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("MEMBER");
  const [tagInput, setTagInput] = useState("");
  const [categoryInput, setCategoryInput] = useState("");
  const [tags, setTags] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editingFeedId, setEditingFeedId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editCategories, setEditCategories] = useState('');

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
  const { data: meData, loading: loadingMe } = useQuery(ME_QUERY);

  useEffect(() => {
    if (!loadingMe && !meData?.me) {
      navigate("/login");
    }
  }, [loadingMe, meData, navigate]);


  // Mutations
  const [createCollection] = useMutation(CREATE_COLLECTION, { onCompleted: () => refetchCols() });
  const [deleteCollection] = useMutation(DELETE_COLLECTION, { onCompleted: () => refetchCols() });
  const [addFeed] = useMutation(ADD_FEED, { onCompleted: () => refetchCols() });
  const [removeFeed] = useMutation(REMOVE_FEED, { onCompleted: () => refetchCols() });
  const [markRead] = useMutation(MARK_READ_MUTATION, { onCompleted: () => refetchArticles() });
  const [markFav] = useMutation(MARK_FAV_MUTATION, { onCompleted: () => refetchArticles() });
  const [addComment] = useMutation(ADD_COMMENT, { onCompleted: () => refetchArticles() });
  const [editCommentMutation] = useMutation(EDIT_COMMENT);
  const [deleteCommentMutation] = useMutation(DELETE_COMMENT);
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

  const { data: tagData } = useQuery(GET_TAGS);
  const { data: categoryData } = useQuery(GET_CATEGORIES);

  // Handlers
  const handleCreateCollection = () => {
    if (newCollectionName.trim()) {
      createCollection({ variables: { name: newCollectionName } });
      setNewCollectionName("");
    }
  };

const handleDeleteCollection = (id) => {
  deleteCollection({ 
    variables: { id },
  })
  .then(() => {
    console.log("Collection supprimée avec succès.");
  })
  .catch((error) => {
    alert(error.message); 
  });
};

  const addTag = (t) => {
  if (!tags.includes(t)) setTags([...tags, t]);
  setTagInput("");
  };
  const addCategory = (c) => {
    if (!categories.includes(c)) setCategories([...categories, c]);
    setCategoryInput("");
  };


const handleAddFeed = () => {
  if (newFeedUrl.trim() && selectedCollection) {
    addFeed({ variables: {
      collectionId: selectedCollection,
      url: newFeedUrl,
      title: newFeedUrl,
      tags: tagInput,
      categories: categoryInput,
    } });
    setNewFeedUrl("");
    setTags([]);
    setCategories([]);
  }
};


const [updateFeed] = useMutation(UPDATE_FEED, {
  onCompleted: () => {
    setEditingFeedId(null);
    refetchCols(); // ou remets à jour localement
  },
  onError: (err) => alert('Erreur : ' + err.message)
});


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


const handleEditComment = async (commentId) => {
  if (!editingContent.trim()) return;
  try {
    const id = parseInt(commentId, 10); 
    await editCommentMutation({
      variables: { id, content: editingContent },
    });

    setEditingCommentId(null);
    setEditingContent('');
    refetch(); 
  } catch (err) {
    console.error("Erreur lors de la modification", err);
  }
};

const handleDeleteComment = async (commentId) => {
  try {
    const id = parseInt(commentId, 10);
    await deleteCommentMutation({
      variables: { id },
    });

    await refetch(); 
    console.log(`Commentaire ${id} supprimé avec succès.`);

  } catch (err) {
    console.error("Erreur lors de la suppression", err);
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

    if (loadingMe) return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontSize: '18px',
      color: '#666'
    }}>
      Vérification de la session...
    </div>
  );


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

          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => navigate("/admin")}
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
              🛠️ Admin Page
            </button>

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
          </div>

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
                width: '95%',
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
            {(collectionsData?.collections || []).map((col) => (
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
                  {errorMessage && (
                    <div className="text-red-600 mt-2 text-sm font-medium">
                      {errorMessage}
                    </div>
                  )}
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
                      marginBottom: '0.25rem',
                      border: '1px solid #e2e8f0' // 👈 Contour ajouté
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

                    {col?.feeds?.map((feed) => (
                      <li key={feed.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0.5rem',
                        borderRadius: '6px',
                        backgroundColor: feed.id === selectedFeed ? '#667eea' : 'transparent',
                        color: feed.id === selectedFeed ? 'white' : '#4a5568',
                        marginBottom: '0.25rem',
                        border: '1px solid #e2e8f0' // 👈 Contour ajouté ici aussi
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
                          <div>
                            {Array.isArray(feed.tags) && feed.tags.map(t => (
                              <span className="tag" key={t}>#{t}</span>
                            ))}
                            {Array.isArray(feed.categories) && feed.categories.map(c => (
                              <span className="category" key={c}>[{c}]</span>
                            ))}
                          </div>
                        </button>
                        <button onClick={() => {
                            setEditingFeedId(feed.id);
                            setEditTitle(feed.title);
                            setEditTags(feed.tags?.join(', ') || '');
                            setEditCategories(feed.categories?.join(', ') || '');
                          }}>✏️</button>
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
                        {/* edit feed form */}
                        {editingFeedId === feed.id && (
                            <div className="edit-form">
                              <input
                                value={editTitle}
                                onChange={e => setEditTitle(e.target.value)}
                                placeholder="Nouveau titre"
                              />
                              <input
                                value={editTags}
                                onChange={e => setEditTags(e.target.value)}
                                placeholder="Tags (séparés par des virgules)"
                              />
                              <input
                                value={editCategories}
                                onChange={e => setEditCategories(e.target.value)}
                                placeholder="Catégories (séparées par des virgules)"
                              />
                              <button onClick={() => updateFeed({
                                variables: {
                                  feedId: feed.id,
                                  title: editTitle,
                                  tags: (editTags || '').split(',').map(t => t.trim()).filter(Boolean),
                                  categories: (editCategories || '').split(',').map(c => c.trim()).filter(Boolean)
                                }
                              })}>💾 Enregistrer</button>
                              <button onClick={() => setEditingFeedId(null)}>❌ Annuler</button>
                            </div>
                          )} 
                      </li>
                    ))}
                  </ul>

                    
                    <div style={{ marginBottom: '1.5rem' }}>
                      <input
                        placeholder="URL RSS"
                        value={newFeedUrl}
                        onChange={(e) => setNewFeedUrl(e.target.value)}
                        style={{
                          width: '95%',
                          padding: '0.5rem',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          fontSize: '13px',
                          marginBottom: '0.5rem',
                          outline: 'none'
                        }}
                      />
                      <input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Ajouter tag..." />
                      <ul>{tagData?.allTags?.filter(t => t.startsWith(tagInput)).map(t => <li onClick={() => addTag(t)}>{t}</li>)}</ul>
                      <div>{tags.map(t => <span>{t}</span>)}</div>

                      <input value={categoryInput} onChange={e => setCategoryInput(e.target.value)} placeholder="Ajouter catégorie..." />
                      <ul>{categoryData?.allCategories?.filter(c => c.startsWith(categoryInput)).map(c => <li onClick={() => addCategory(c)}>{c}</li>)}</ul>
                      <div>{categories.map(c => <span>{c}</span>)}</div>
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
                          width: '95%',
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
                        width: '95%',
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
            onChange={(e) => {
              const value = e.target.value;
              setSearchQuery(value);
              if (value.length >= 2) {
                clearTimeout(window.searchDebounce);
                window.searchDebounce = setTimeout(() => {
                  window.searchReady = true;
                }, 500);
              } else {
                window.searchReady = false;
              }
            }}
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
            onClick={() => {
              if (window.searchReady) {
                handleSearch();
              } else {
                console.log("Not ready: type at least 2 characters and wait a moment.");
              }
            }}
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

{selectedFeed && (() => {
  const feedInfo = collectionsData?.collections
    ?.find(col => col.id === selectedCollection)
    ?.feeds?.find(f => f.id === selectedFeed);

  return feedInfo ? (
    <div style={{ marginBottom: '1rem' }}>
      <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Flux : {feedInfo.title}</h3>
      <div style={{ marginBottom: '0.25rem' }}>
        Tags : {(feedInfo.tags || []).map((t, i) => (
          <span key={i} style={{ marginRight: '0.5rem', color: '#667eea' }}>#{t}</span>
        ))}
      </div>
      <div>
        Catégories : {(feedInfo.categories || []).map((c, i) => (
          <span key={i} style={{ marginRight: '0.5rem', color: '#805ad5' }}>[{c}]</span>
        ))}
      </div>
    </div>
  ) : null;
})()}

              
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

                    
                    <div style={{
                      display: 'flex',
                      gap: '0.75rem',
                      marginBottom: '1.5rem'
                    }}>
                      <h3 style={{ margin: '0 0 0.25rem 0' }}> 
                        <a 
                          href={article.link} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          style={{ textDecoration: 'none', color: '#0077cc' }}
                        >
                          {article.title}
                        </a>
                      </h3>

                      {article.author && (
                        <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.75rem' }}>
                          par {article.author}
                        </div>
                      )}

                    {article.content && (
                      <p style={{ marginTop: '0.5rem' }}>
                        {article.content.substring(0, 300)}...
                      </p>
                    )}
                    <div style={{ marginTop: '0.5rem' }}>
                      {article.isRead ? "✅ Lu" : "📄 Non lu"}
                      {article.isFavorite && <span style={{ marginLeft: '1rem', color: 'gold' }}>★ Favori</span>}
                    </div>
                      
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
                    <div style={{ marginBottom: '1rem' }}>
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
                      borderTop: '1px solid #e2e8f0',
                      paddingTop: '1rem'
                    }}>
<h4 style={{ color: '#2d3748', fontSize: '16px', fontWeight: '600', marginBottom: '0.75rem' }}>Commentaires</h4>
<div style={{ marginBottom: '1rem', maxHeight: '150px', overflowY: 'auto' }}>
  {article.comments.map((c) => (
    <div key={c.id} style={{ backgroundColor: '#f7fafc', padding: '0.75rem', borderRadius: '8px', marginBottom: '0.5rem', border: '1px solid #e2e8f0' }}>
      {editingCommentId === c.id ? (
        <>
          <input
            value={editingContent}
            onChange={(e) => setEditingContent(e.target.value)}
            style={{ width: '100%', padding: '4px', marginBottom: '6px' }}
          />
          <button onClick={() => handleEditComment(c.id)} style={{ marginRight: '0.5rem' }}>✅ Enregistrer</button>
          <button onClick={() => setEditingCommentId(null)}>❌ Annuler</button>
        </>
      ) : (
        <>
          <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
            <span style={{ fontWeight: '600', color: '#667eea', marginRight: '0.5rem' }}>{c.author.name}:</span>
            <span style={{ color: '#4a5568' }}>{c.content}</span>
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <button onClick={() => { setEditingCommentId(c.id); setEditingContent(c.content); }} style={{ marginRight: '0.5rem' }}>✏️ Modifier</button>
            <button onClick={() => handleDeleteComment(c.id)}>🗑️ Supprimer</button>
          </div>
        </>
      )}
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