import React, { useEffect, useState } from 'react';
import { useQuery, gql, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';



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
        canRead
        canAddFeed
        canComment
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
          author { 
            id
            name 
          }
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

const RENAME_COLLECTION = gql`
  mutation RenameCollection($id: ID!, $name: String!) {
    renameCollection(id: $id, name: $name) {
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

const EDIT_MESSAGE = gql`
  mutation EditMessage($id: Int!, $content: String!) {
    editMessage(id: $id, content: $content) {
      id
      content
    }
  }
`;

const DELETE_MESSAGE = gql`
  mutation DeleteMessage($id: Int!) {
    deleteMessage(id: $id) {
      id
    }
  }
`;

const ADD_MEMBER = gql`
  mutation AddMember($collectionId: ID!, $userEmail: String!, $role: Role, $canRead: Boolean, $canAddFeed: Boolean, $canComment: Boolean) {
    addMember(collectionId: $collectionId, userEmail: $userEmail, role: $role, canRead: $canRead, canAddFeed: $canAddFeed, canComment: $canComment) {
      user { id email name }
      role
      canRead
      canAddFeed
      canComment
    }
  }
`;

const UPDATE_MEMBER = gql`
  mutation UpdateMember($collectionId: ID!, $userId: ID!, $canRead: Boolean!, $canAddFeed: Boolean!, $canComment: Boolean!) {
    updateMember(collectionId: $collectionId, userId: $userId, canRead: $canRead, canAddFeed: $canAddFeed, canComment: $canComment) {
      user { id email name }
      role
      canRead
      canAddFeed
      canComment
    }
  }
`;

const REMOVE_MEMBER = gql`
  mutation RemoveMember($collectionId: ID!, $userId: ID!) {
    removeMember(collectionId: $collectionId, userId: $userId)
  }
`;

const EXPORT_FEEDS = gql`
  mutation ExportFeeds($collectionId: ID,$format: String!) {
    exportFeeds(collectionId: $collectionId,format: $format)
  }
`;

const IMPORT_FEEDS = gql`
  mutation ImportFeeds($collectionId: Int!, $content: String!, $format: String!) {
    importFeeds(collectionId: $collectionId, content: $content, format: $format)
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
  const [renamingCollectionId, setRenamingCollectionId] = useState(null);
  const [renamingName, setRenamingName] = useState("");
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [collections, setCollections] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [errorMessage, setErrorMessage] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [newMessage, setNewMessage] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("MEMBER");
  const [newMemberCanRead, setNewMemberCanRead] = useState(true);
  const [newMemberCanAdd, setNewMemberCanAdd] = useState(false);
  const [newMemberCanComment, setNewMemberCanComment] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [editingCanRead, setEditingCanRead] = useState(true);
  const [editingCanAdd, setEditingCanAdd] = useState(false);
  const [editingCanComment, setEditingCanComment] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [categoryInput, setCategoryInput] = useState("");
  const [tags, setTags] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editingFeedId, setEditingFeedId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editCategories, setEditCategories] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [onlyUnread, setOnlyUnread] = useState(null); 
  const [onlyFavorites, setOnlyFavorites] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingMessageContent, setEditingMessageContent] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [exportFormat, setExportFormat] = useState('opml');


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
  const [updateFeed] = useMutation(UPDATE_FEED);
  const [removeFeed] = useMutation(REMOVE_FEED, { onCompleted: () => refetchCols() });
  const [markRead] = useMutation(MARK_READ_MUTATION, { onCompleted: () => refetchArticles() });
  const [markFav] = useMutation(MARK_FAV_MUTATION, { onCompleted: () => refetchArticles() });
  const [addComment] = useMutation(ADD_COMMENT, { onCompleted: () => refetchArticles() });
  const [editCommentMutation] = useMutation(EDIT_COMMENT);
  const [deleteCommentMutation] = useMutation(DELETE_COMMENT);
  const [addMessage] = useMutation(ADD_MESSAGE, { onCompleted: () => refetchCols() });
  const [editMessageMutation] = useMutation(EDIT_MESSAGE);
  const [deleteMessageMutation] = useMutation(DELETE_MESSAGE);  


  const [renameCollection, { loading: renaming }] = useMutation(RENAME_COLLECTION, {
  onCompleted: () => {
    setRenamingCollectionId(null);
    setRenamingName("");
    refetchCols(); 
  },
  onError: (err) => alert(err.message)
  });

  const [addMember] = useMutation(ADD_MEMBER, {
    onCompleted: (data) => {
      alert(`Membre ajouté : ${data.addMember.user.email}`);
      refetchCols();
      setNewMemberEmail("");
      setNewMemberRole("MEMBER");
      setNewMemberCanRead(true);
      setNewMemberCanAdd(false);
      setNewMemberCanComment(false);
    },
    onError: (err) => {
      alert("Erreur : " + err.message);
    }
  });  
  const [removeMember] = useMutation(REMOVE_MEMBER, { onCompleted: () => refetchCols() });
  const [updateMember] = useMutation(UPDATE_MEMBER, {
    onCompleted: () => { setEditingMemberId(null); refetchCols(); }
  });
  const [exportFeeds] = useMutation(EXPORT_FEEDS);
  const [importFeeds] = useMutation(IMPORT_FEEDS, {
    onCompleted: () => {
      refetchCols();
      alert('Import réussi !');
    },
    onError: (err) => alert("Erreur à l'import : " + err.message)
  });
  


  const { data: tagData } = useQuery(GET_TAGS);
  const { data: categoryData } = useQuery(GET_CATEGORIES);

  const currentCollection = (collectionsData?.collections || []).find(c => c.id === selectedCollection);
  const myMembership = currentCollection?.members?.find(m => m.user.id === meData?.me?.id);
  const myPriv = {
    isOwner: myMembership?.role === 'OWNER',
    canRead: (myMembership?.role === 'OWNER') || !!myMembership?.canRead,
    canAddFeed: (myMembership?.role === 'OWNER') || !!myMembership?.canAddFeed,
    canComment: (myMembership?.role === 'OWNER') || !!myMembership?.canComment,
  };

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
      const tagList = [
        ...tags,
        ...((tagInput || '').split(',').map(t => t.trim()).filter(Boolean)),
      ];
      const categoryList = [
        ...categories,
        ...((categoryInput || '').split(',').map(c => c.trim()).filter(Boolean)),
      ];
    addFeed({
      variables: {
        collectionId: selectedCollection,
        url: newFeedUrl,
        title: newFeedUrl,
        tags: Array.from(new Set(tagList)),
        categories: Array.from(new Set(categoryList)),
      }
    });
    setNewFeedUrl('');
    setTagInput('');
    setCategoryInput('');
    setTags([]);
    setCategories([]);
    refetchCols();
  }
};


const handleUpdateFeed = (feedId) => {
  if (!editTitle.trim()) {
    alert("Le titre ne peut pas être vide.");
    return;
  }

  updateFeed({
    variables: {
      feedId,
      title: editTitle,
      tags: (editTags || '').split(',').map(t => t.trim()).filter(Boolean),
      categories: (editCategories || '').split(',').map(c => c.trim()).filter(Boolean),
    }
  })
  .then(() => {
    alert("Flux mis à jour !");
    setEditingFeedId(null);
    setEditTitle('');
    setEditTags('');
    setEditCategories('');
    refetchCols();
  })
  .catch((error) => {
    alert("Erreur lors de la mise à jour du flux : " + error.message);
  });
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


const handleEditComment = async (commentId) => {
  if (!editingContent.trim()) return;
  try {
    const id = parseInt(commentId, 10); 
    await editCommentMutation({
      variables: { id, content: editingContent },
    });

    setEditingCommentId(null);
    setEditingContent('');
    refetchArticles(); 
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

    await refetchArticles(); 
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

  const handleEditMessage = async (id) => {
  try {
    await editMessageMutation({
      variables: { id: parseInt(id, 10), content: editingMessageContent },
    });
    setEditingMessageId(null);
    setEditingMessageContent('');
    refetchCols();
  } catch (err) {
    console.error("Erreur modification message :", err);
  }
};

const handleDeleteMessage = async (id) => {
  try {
    await deleteMessageMutation({
      variables: { id: parseInt(id, 10) },
    });
    refetchCols();
  } catch (err) {
    console.error("Erreur suppression message :", err);
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
        role: newMemberRole,
        canRead: newMemberCanRead,
        canAddFeed: newMemberCanAdd,
        canComment: newMemberCanComment
      }
    });
  };

   const openEditPrivileges = (member) => {
    setEditingMemberId(member.user.id);
    setEditingCanRead(member.role === 'OWNER' ? true : !!member.canRead);
    setEditingCanAdd(member.role === 'OWNER' ? true : !!member.canAddFeed);
    setEditingCanComment(member.role === 'OWNER' ? true : !!member.canComment);
  };
  const handleSaveMemberPrivileges = async () => {
    if (!editingMemberId || !selectedCollection) return;
    await updateMember({
      variables: {
        collectionId: selectedCollection,
        userId: editingMemberId,
        canRead: editingCanRead,
        canAddFeed: editingCanAdd,
        canComment: editingCanComment
      }
    });
  };
  const handleRemoveAllPrivileges = async (userId) => {
    if (!selectedCollection) return;
    await updateMember({
      variables: {
        collectionId: selectedCollection,
        userId,
        canRead: false,
        canAddFeed: false,
        canComment: false
      }
    });
  };

  const handleRemoveMember = (userId) => {
    removeMember({
      variables: { collectionId: selectedCollection, userId }
    });
  };

  const handleExport = async (format) => {
    if (!selectedCollection) {
    alert("Sélectionnez une collection à exporter.");
    return;
  }
    const { data } = await exportFeeds({ variables: { collectionId: selectedCollection,format } });
    const blob = new Blob([data.exportFeeds], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `collection-${selectedCollection}-feeds.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file || !selectedCollection) {
      alert('Sélectionnez un fichier et une collection.');
      return;
    }

    const extension = file.name.split('.').pop().toLowerCase();
    let format;
    switch (extension) {
      case 'opml':
        format = 'opml';
        break;
      case 'xml':
        format = 'xml'; // Traité comme RSS unique
        break;
      case 'csv':
        format = 'csv';
        break;
      case 'json':
        format = 'json';
        break;
      default:
        alert('Format de fichier non supporté. Utilisez .opml, .csv, .json ou .xml.');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      importFeeds({
        variables: {
          collectionId: parseInt(selectedCollection),
          content,
          format
        }
      });
    };
    reader.onerror = () => alert('Erreur de lecture du fichier.');
    reader.readAsText(file, 'UTF-8'); // Gère l'encodage UTF-8 par défaut
  };


  const handleSearch = () => {
    refetchArticles();
    setArticleFilters({
      tag: selectedTag || undefined,
      unread: onlyUnread,
      favorite: onlyFavorites,
      feedId: selectedSource || undefined,
    });
  };

    if (loadingMe) return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontSize: '20px',
      fontWeight: '500',
      color: '#4A5568',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        padding: '2rem 3rem',
        borderRadius: '20px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.2)'
      }}>
        ✨ Vérification de la session...
      </div>
    </div>
  );


  if (loadingCols) return <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '20px',
    fontWeight: '500',
    color: '#4A5568',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  }}>
    <div style={{
      background: 'rgba(255,255,255,0.95)',
      padding: '2rem 3rem',
      borderRadius: '20px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,0.2)'
    }}>
      📚 Chargement collections...
    </div>
  </div>;
  
  if (loadingArts) return <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '20px',
    fontWeight: '500',
    color: '#4A5568',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  }}>
    <div style={{
      background: 'rgba(255,255,255,0.95)',
      padding: '2rem 3rem',
      borderRadius: '20px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,0.2)'
    }}>
      📰 Chargement articles...
    </div>
  </div>;

  return (
    <div className="app-layout" style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <header className="top-bar" style={{
        padding: '1.5rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{
          margin: 0,
          fontSize: '5rem',
          fontWeight: '800',
          letterSpacing: '0.1em',
          textShadow: '0 2px 4px rgba(0,0,0,0.1)',
          background: 'linear-gradient(45deg, #ffffff, #e2e8f0)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>SUPRSS</h1>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={() => navigate("/settings")}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '15px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '14px',
                fontWeight: '600',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
              }}
              onMouseOver={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.25)';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.15)';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
              }}
            >
              ⚙️ Paramètres
            </button>
          </div>

      </header>

      <div className="main-section" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* SIDEBAR */}
        <aside className="sidebar" style={{ width: '380px', padding: '2rem', overflowY: 'auto' }}>
          <h2 style={{
            color: '#2D3748',
            fontSize: '1.5rem',
            fontWeight: '700',
            marginBottom: '1.5rem',
            borderBottom: '3px solid #667eea',
            paddingBottom: '0.75rem',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>Collections</h2>
          
          <div style={{ marginBottom: '2rem' }}>
            <input
              placeholder="✨ Nouvelle collection"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              style={{
                width: '90%',
                padding: '1rem',
                border: '2px solid #E2E8F0',
                borderRadius: '15px',
                fontSize: '15px',
                marginBottom: '0.75rem',
                outline: 'none',
                transition: 'all 0.3s ease',
                background: 'rgba(255,255,255,0.8)',
                backdropFilter: 'blur(5px)',
                boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#667eea';
                e.target.style.boxShadow = '0 4px 20px rgba(102,126,234,0.15)';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#E2E8F0';
                e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.05)';
                e.target.style.transform = 'translateY(0)';
              }}
            />
            <button 
              onClick={handleCreateCollection}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                padding: '1rem',
                borderRadius: '15px',
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(102,126,234,0.3)'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 25px rgba(102,126,234,0.4)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 15px rgba(102,126,234,0.3)';
              }}
            >
              ➕ Créer Collection
            </button>
          </div>

          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {(collectionsData?.collections || []).map((col) => (
              <li key={col.id} style={{
                marginBottom: '1rem',
                border: '2px solid rgba(226,232,240,0.6)',
                borderRadius: '20px',
                backgroundColor: col.id === selectedCollection ? 'rgba(102,126,234,0.1)' : 'rgba(255,255,255,0.8)',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                backdropFilter: 'blur(10px)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '1rem'
                }}>
                  <button 
                    onClick={() => setSelectedCollection(col.id)}
                    style={{
                      flex: 1,
                      background: 'none',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: col.id === selectedCollection ? '700' : '500',
                      color: col.id === selectedCollection ? '#667eea' : '#2D3748',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {col.name} {col.isShared ? "👥" : "🔒"}
                  </button>
                  {col.members?.some(m => m.user.id === meData?.me?.id && m.role === 'OWNER') && (
                    <button
                      onClick={() => { setRenamingCollectionId(col.id); setRenamingName(col.name || ""); }}
                      style={{
                        background: 'rgba(72,187,120,0.15)',
                        border: '1px solid rgba(72,187,120,0.2)',
                        cursor: 'pointer',
                        padding: '0.5rem',
                        borderRadius: '10px',
                        marginRight: '0.5rem',
                        transition: 'all 0.3s ease',
                        fontSize: '14px'
                      }}
                      title="Renommer la collection"
                    >
                      ✏️
                    </button>
                  )}
                  <button 
                    onClick={() => handleDeleteCollection(col.id)}
                    style={{
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.2)',
                      cursor: 'pointer',
                      padding: '0.5rem',
                      borderRadius: '10px',
                      transition: 'all 0.3s ease',
                      fontSize: '14px'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = 'rgba(239,68,68,0.2)';
                      e.target.style.transform = 'scale(1.1)';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = 'rgba(239,68,68,0.1)';
                      e.target.style.transform = 'scale(1)';
                    }}
                  >
                    🗑️
                  </button>
                  {renamingCollectionId === col.id && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 'calc(100% + 8px)',  
                        right: 0,
                        width: 280,
                        background: 'rgba(255,255,255,0.98)',
                        border: '1px solid rgba(226,232,240,0.6)',
                        borderRadius: 12,
                        boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
                        padding: '0.75rem',
                        zIndex: 20
                      }}
                    >
                      <input
                        autoFocus
                        value={renamingName}
                        onChange={e => setRenamingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && renamingName.trim()) {
                            renameCollection({ variables: { id: col.id, name: renamingName.trim() } });
                          }
                          if (e.key === 'Escape') {
                            setRenamingCollectionId(null);
                            setRenamingName("");
                          }
                        }}
                        placeholder="Nouveau nom"
                        style={{
                          width: '90%',
                          padding: '0.55rem 0.7rem',
                          border: '2px solid #CBD5E0',
                          borderRadius: 10,
                          fontSize: 14,
                          outline: 'none',
                          marginBottom: 8
                        }}
                      />
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button
                          disabled={renaming || !renamingName.trim()}
                          onClick={() => renameCollection({ variables: { id: col.id, name: renamingName.trim() } })}
                          style={{
                            background: 'linear-gradient(135deg, #48BB78 0%, #38A169 100%)',
                            color: '#fff',
                            border: 'none',
                            padding: '0.5rem 0.8rem',
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: renaming ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {renaming ? '…' : '💾 Enregistrer'}
                        </button>
                        <button
                          onClick={() => { setRenamingCollectionId(null); setRenamingName(""); }}
                          style={{
                            background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                            color: '#fff',
                            border: 'none',
                            padding: '0.5rem 0.8rem',
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          ❌ Annuler
                        </button>
                      </div>
                    </div>
                  )}
                  {errorMessage && (
                    <div style={{
                      color: '#EF4444',
                      marginTop: '0.5rem',
                      fontSize: '14px',
                      fontWeight: '500',
                      padding: '0.5rem',
                      backgroundColor: 'rgba(239,68,68,0.1)',
                      borderRadius: '8px'
                    }}>
                      {errorMessage}
                    </div>
                  )}
                </div>
                
                {/* FEEDS */}
                {col.id === selectedCollection && (
                  <div style={{
                    borderTop: '1px solid rgba(226,232,240,0.6)',
                    padding: '1.5rem',
                    background: 'rgba(248,250,252,0.8)',
                    borderRadius: '0 0 18px 18px'
                  }}>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem 0' }}>
                    <li style={{
                      padding: '0.75rem',
                      borderRadius: '12px',
                      background: !selectedFeed ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(255,255,255,0.7)',
                      color: !selectedFeed ? 'white' : '#4A5568',
                      marginBottom: '0.5rem',
                      border: '2px solid rgba(226,232,240,0.4)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      transition: 'all 0.3s ease'
                    }}>
                      <button 
                        onClick={() => setSelectedFeed(null)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'inherit',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '600'
                        }}
                      >
                        📰 Tous les articles
                      </button>
                    </li>

                    {col?.feeds?.map((feed) => (
                      <li key={feed.id} style={{
                        padding: '1rem',
                        borderRadius: '15px',
                        background: feed.id === selectedFeed ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(255,255,255,0.8)',
                        color: feed.id === selectedFeed ? 'white' : '#2D3748',
                        marginBottom: '0.75rem',
                        border: '2px solid rgba(226,232,240,0.4)',
                        boxShadow: '0 6px 15px rgba(0,0,0,0.08)',
                        transition: 'all 0.3s ease',
                        backdropFilter: 'blur(10px)'
                      }}>
                        {/* Ligne principale : Titre + Tags + Boutons */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <button
                            onClick={() => setSelectedFeed(feed.id)}
                            style={{
                              flex: 1,
                              background: 'none',
                              border: 'none',
                              textAlign: 'left',
                              color: 'inherit',
                              cursor: 'pointer',
                              fontSize: '15px',
                              fontWeight: '700'
                            }}
                          >
                            📡 {feed.title}
                            <div style={{ marginTop: '0.5rem', fontSize: '12px', display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                              {Array.isArray(feed.tags) && feed.tags.map(t => (
                                <span key={t} style={{
                                  background: 'rgba(102,126,234,0.15)',
                                  borderRadius: '8px',
                                  padding: '0.2rem 0.6rem',
                                  color: '#667eea',
                                  fontWeight: '600',
                                  border: '1px solid rgba(102,126,234,0.2)'
                                }}>#{t}</span>
                              ))}
                              {Array.isArray(feed.categories) && feed.categories.map(c => (
                                <span key={c} style={{
                                  background: 'rgba(72,187,120,0.15)',
                                  borderRadius: '8px',
                                  padding: '0.2rem 0.6rem',
                                  color: '#48BB78',
                                  fontWeight: '600',
                                  border: '1px solid rgba(72,187,120,0.2)'
                                }}>[{c}]</span>
                              ))}
                            </div>
                          </button>
                          <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                            <button onClick={() => {
                              setEditingFeedId(feed.id);
                              setEditTitle(feed.title);
                              setEditTags(feed.tags?.join(', ') || '');
                              setEditCategories(feed.categories?.join(', ') || '');
                            }} style={{
                              background: 'rgba(72,187,120,0.15)',
                              border: '1px solid rgba(72,187,120,0.2)',
                              borderRadius: '8px',
                              padding: '0.5rem',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}>✏️</button>
                            <button 
                              onClick={() => handleRemoveFeed(feed.id)}
                              style={{
                                background: 'rgba(239,68,68,0.15)',
                                border: '1px solid rgba(239,68,68,0.2)',
                                borderRadius: '8px',
                                padding: '0.5rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        {/* Formulaire sous le contenu */}
                        {editingFeedId === feed.id && (
                          <div style={{ borderTop: '1px solid rgba(226,232,240,0.6)', padding: '1.5rem', borderRadius: '0 0 18px 18px' }}>
                            <input
                              value={editTitle}
                              onChange={e => setEditTitle(e.target.value)}
                              placeholder="Nouveau titre"
                              style={{ 
                                width: '100%', 
                                marginBottom: '0.75rem', 
                                padding: '0.75rem', 
                                fontSize: '14px', 
                                borderRadius: '8px', 
                                border: '2px solid #CBD5E0',
                                background: 'rgba(255,255,255,0.9)',
                                transition: 'all 0.2s ease'
                              }}
                            />
                            <input
                              value={editTags}
                              onChange={e => setEditTags(e.target.value)}
                              placeholder="Tags (séparés par des virgules)"
                              style={{ 
                                width: '100%', 
                                marginBottom: '0.75rem', 
                                padding: '0.75rem', 
                                fontSize: '14px', 
                                borderRadius: '8px', 
                                border: '2px solid #CBD5E0',
                                background: 'rgba(255,255,255,0.9)',
                                transition: 'all 0.2s ease'
                              }}
                            />
                            <input
                              value={editCategories}
                              onChange={e => setEditCategories(e.target.value)}
                              placeholder="Catégories (séparées par des virgules)"
                              style={{ 
                                width: '100%', 
                                marginBottom: '0.75rem', 
                                padding: '0.75rem', 
                                fontSize: '14px', 
                                borderRadius: '8px', 
                                border: '2px solid #CBD5E0',
                                background: 'rgba(255,255,255,0.9)',
                                transition: 'all 0.2s ease'
                              }}
                            />
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                              <button
                                onClick={() => handleUpdateFeed(feed.id)}
                                style={{
                                  background: 'linear-gradient(135deg, #48BB78 0%, #38A169 100%)',
                                  color: 'white',
                                  border: 'none',
                                  padding: '0.75rem 1.5rem',
                                  borderRadius: '10px',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                  fontWeight: '600',
                                  transition: 'all 0.3s ease',
                                  boxShadow: '0 4px 12px rgba(72,187,120,0.3)'
                                }}
                              >
                                💾 Enregistrer
                              </button>
                              <button
                                onClick={() => setEditingFeedId(null)}
                                style={{
                                  background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                                  color: 'white',
                                  border: 'none',
                                  padding: '0.75rem 1.5rem',
                                  borderRadius: '10px',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                  fontWeight: '600',
                                  transition: 'all 0.3s ease',
                                  boxShadow: '0 4px 12px rgba(239,68,68,0.3)'
                                }}
                              >
                                ❌ Annuler
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>

                    <h4 style={{
                      color: '#2D3748',
                      fontSize: '16px',
                      fontWeight: '700',
                      marginBottom: '1rem',
                      display: 'block',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>🌐 Ajout de Flux</h4>
                    {myPriv.canAddFeed ? (
                    <div style={{ marginBottom: '2rem' }}>
                      <input
                        placeholder="🌐 URL RSS"
                        value={newFeedUrl}
                        onChange={(e) => setNewFeedUrl(e.target.value)}
                        style={{
                          width: '90%',
                          padding: '0.75rem',
                          border: '2px solid #E2E8F0',
                          borderRadius: '12px',
                          fontSize: '14px',
                          marginBottom: '0.75rem',
                          outline: 'none',
                          background: 'rgba(255,255,255,0.9)',
                          transition: 'all 0.3s ease'
                        }}
                      />
                      <input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="🏷️ Ajouter tag..." style={{
                        width: '90%',
                        padding: '0.5rem',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        fontSize: '13px',
                        marginBottom: '0.5rem',
                        background: 'rgba(255,255,255,0.8)'
                      }} />
                      <ul style={{ maxHeight: '100px', overflowY: 'auto', background: 'rgba(255,255,255,0.9)', borderRadius: '8px', padding: '0.5rem',marginBottom: '0.75rem' }}>
                        {tagData?.allTags?.filter(t => t.startsWith(tagInput)).map(t => 
                          <li key={t} onClick={() => addTag(t)} style={{ 
                            padding: '0.25rem', 
                            cursor: 'pointer', 
                            borderRadius: '4px',
                            transition: 'background 0.2s ease'
                          }} onMouseOver={(e) => e.target.style.background = '#F7FAFC'} onMouseOut={(e) => e.target.style.background = 'transparent'}>{t}</li>
                        )}
                      </ul>
                      <div style={{ marginBottom: '0.75rem' }}>
                        {tags.map(t => <span key={t} style={{
                          background: 'rgba(102,126,234,0.15)',
                          color: '#667eea',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '6px',
                          marginRight: '0.5rem',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>#{t}</span>)}
                      </div>

                      <input value={categoryInput} onChange={e => setCategoryInput(e.target.value)} placeholder="📂 Ajouter catégorie..." style={{
                        width: '90%',
                        padding: '0.5rem',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        fontSize: '13px',
                        marginBottom: '0.5rem',
                        background: 'rgba(255,255,255,0.8)'
                      }} />
                      <ul style={{ maxHeight: '100px', overflowY: 'auto', background: 'rgba(255,255,255,0.9)', borderRadius: '8px', padding: '0.5rem',marginBottom: '0.75rem' }}>
                        {categoryData?.allCategories?.filter(c => c.startsWith(categoryInput)).map(c => 
                          <li key={c} onClick={() => addCategory(c)} style={{ 
                            padding: '0.25rem', 
                            cursor: 'pointer', 
                            borderRadius: '4px',
                            transition: 'background 0.2s ease'
                          }} onMouseOver={(e) => e.target.style.background = '#F7FAFC'} onMouseOut={(e) => e.target.style.background = 'transparent'}>{c}</li>
                        )}
                      </ul>
                      <div style={{ marginBottom: '0.75rem' }}>
                        {categories.map(c => <span key={c} style={{
                          background: 'rgba(72,187,120,0.15)',
                          color: '#48BB78',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '6px',
                          marginRight: '0.5rem',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>[{c}]</span>)}
                      </div>
                      <button 
                        onClick={handleAddFeed}
                        style={{
                          width: '100%',
                          background: 'linear-gradient(135deg, #48BB78 0%, #38A169 100%)',
                          color: 'white',
                          border: 'none',
                          padding: '0.75rem',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '600',
                          transition: 'all 0.3s ease',
                          boxShadow: '0 4px 12px rgba(72,187,120,0.3)'
                        }}
                      >
                        ➕ Ajouter flux
                      </button>
                      <div style={{ margin: '1rem 0' }}>
                          <label htmlFor="import-file" style={{
                            width: '85%',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '15px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            display: 'inline-block',
                            boxShadow: '0 4px 15px rgba(102,126,234,0.3)',
                            transition: 'all 0.3s ease'
                          }}>
                            📥 Importer flux
                          </label>
                          <input
                            type="file"
                            id="import-file"
                            accept=".opml,.csv,.json,.xml"
                            style={{ display: 'none' }}
                            onChange={handleImport}
                          />
                        </div>
                    </div>
                    ) : null}
                    
                    <h4 style={{
                      color: '#2D3748',
                      fontSize: '16px',
                      fontWeight: '700',
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>👥 Membres</h4>
                    <ul style={{ 
                      listStyle: 'none', 
                      padding: 0, 
                      margin: '0 0 1.5rem 0' 
                    }}>
                      {col.members.map((m) => (
                        <li 
                          key={m.user.id} 
                          style={{
                            display: 'flex',
                            flexDirection: 'column',          
                            alignItems: 'stretch',
                            padding: '0.85rem 1rem',
                            background: 'rgba(255, 255, 255, 0.85)',
                            borderRadius: '14px',
                            marginBottom: '0.6rem',
                            fontSize: '14px',
                            border: '1px solid rgba(226,232,240,0.6)',
                            backdropFilter: 'blur(6px)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                            transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                          }}
                        >
                          {/* ---- LIGNE PRINCIPALE (row) ---- */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%'
                          }}>
                            <span style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              {m.user.name} 
                              <span style={{ 
                                background: m.role === 'OWNER' ? 'rgba(245,101,101,0.15)' : 'rgba(66,153,225,0.15)',
                                color: m.role === 'OWNER' ? '#E53E3E' : '#3182CE',
                                padding: '0.25rem 0.6rem',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: '700'
                              }}>
                                {m.role}
                              </span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                {m.role === 'OWNER' || m.canRead ? <span title="Lecture">👁️</span> : null}
                                {m.role === 'OWNER' || m.canAddFeed ? <span title="Ajout de flux">➕</span> : null}
                                {m.role === 'OWNER' || m.canComment ? <span title="Commentaire">💬</span> : null}
                              </span>
                            </span>

                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              {(col.members.find(mm => mm.user.id === meData?.me?.id)?.role === 'OWNER') && m.role !== 'OWNER' && (
                                <button
                                  onClick={() => openEditPrivileges(m)}
                                  style={{ 
                                    background: 'rgba(99,102,241,0.1)', 
                                    border: '1px solid rgba(99,102,241,0.3)', 
                                    borderRadius: '8px', 
                                    padding: '0.45rem 0.55rem', 
                                    cursor: 'pointer',
                                    transition: 'background 0.2s ease',
                                    fontSize: '14px'
                                  }}
                                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(99,102,241,0.2)'}
                                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(99,102,241,0.1)'}
                                  title="Modifier privilèges"
                                >🔧</button>
                              )}
                              <button 
                                onClick={() => handleRemoveMember(m.user.id)}
                                style={{ 
                                  background: 'rgba(239,68,68,0.1)', 
                                  border: '1px solid rgba(239,68,68,0.3)', 
                                  borderRadius: '8px', 
                                  padding: '0.45rem 0.55rem', 
                                  cursor: 'pointer',
                                  transition: 'background 0.2s ease',
                                  fontSize: '14px'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                                title="Supprimer membre"
                              >❌</button>
                            </div>
                          </div>

                          {/* ---- PANNEAU D’ÉDITION (sous la row) ---- */}
                          {editingMemberId === m.user.id && (
                            <div style={{ 
                              width: '90%',                         
                              marginTop: '0.75rem', 
                              padding: '0.75rem', 
                              border: '1px solid #E2E8F0', 
                              borderRadius: '12px', 
                              background: 'rgba(255,255,255,0.9)', 
                              boxShadow: '0 2px 6px rgba(0,0,0,0.04)' 
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <label><input type="checkbox" checked={editingCanRead} onChange={e => setEditingCanRead(e.target.checked)} /> Lecture</label>
                                <label><input type="checkbox" checked={editingCanAdd} onChange={e => setEditingCanAdd(e.target.checked)} /> Ajout flux</label>
                                <label><input type="checkbox" checked={editingCanComment} onChange={e => setEditingCanComment(e.target.checked)} /> Commentaire</label>
                              </div>
                              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                <button onClick={() => setEditingMemberId(null)} style={{ padding: '0.4rem 0.7rem', borderRadius: '6px', background: '#EDF2F7', border: 'none' }}>Annuler</button>
                                <button onClick={() => handleRemoveAllPrivileges(m.user.id)} style={{ padding: '0.4rem 0.7rem', borderRadius: '6px', background: '#FED7D7', border: 'none' }}>Supprimer privilèges</button>
                                <button onClick={handleSaveMemberPrivileges} style={{ padding: '0.4rem 0.7rem', borderRadius: '6px', background: '#C6F6D5', border: 'none' }}>Enregistrer</button>
                              </div>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>


                    
                    <div style={{ marginBottom: '2rem' }}>
                      <input
                        placeholder="📧 Email membre"
                        value={newMemberEmail}
                        onChange={(e) => setNewMemberEmail(e.target.value)}
                        style={{
                          width: '90%',
                          padding: '0.75rem',
                          border: '2px solid #E2E8F0',
                          borderRadius: '12px',
                          fontSize: '14px',
                          marginBottom: '0.75rem',
                          outline: 'none',
                          background: 'rgba(255,255,255,0.9)',
                          transition: 'all 0.3s ease'
                        }}
                      />
                      <select 
                        value={newMemberRole} 
                        onChange={(e) => setNewMemberRole(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '2px solid #E2E8F0',
                          borderRadius: '12px',
                          fontSize: '14px',
                          marginBottom: '0.75rem',
                          outline: 'none',
                          background: 'rgba(255,255,255,0.9)',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        <option value="OWNER">👑 OWNER</option>
                        <option value="MEMBER">👤 MEMBER</option>
                      </select>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <label><input type="checkbox" checked={newMemberCanRead} onChange={(e) => setNewMemberCanRead(e.target.checked)} /> Lecture</label>
                        <label><input type="checkbox" checked={newMemberCanAdd} onChange={(e) => setNewMemberCanAdd(e.target.checked)} /> Ajout flux</label>
                        <label><input type="checkbox" checked={newMemberCanComment} onChange={(e) => setNewMemberCanComment(e.target.checked)} /> Commentaire</label>
                      </div>
                      <button 
                        onClick={handleAddMember}
                        style={{
                          width: '100%',
                          background: 'linear-gradient(135deg, #4299E1 0%, #3182CE 100%)',
                          color: 'white',
                          border: 'none',
                          padding: '0.75rem',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '600',
                          transition: 'all 0.3s ease',
                          boxShadow: '0 4px 12px rgba(66,153,225,0.3)'
                        }}
                      >
                        ➕ Inviter membre
                      </button>
                    </div>

                    <h4 style={{
                      color: '#2D3748',
                      fontSize: '16px',
                      fontWeight: '700',
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>💬 Chat</h4>
                    
                    <ul style={{ 
                      listStyle: 'none', 
                      padding: '1rem', 
                      margin: '0 0 1.5rem 0',
                      maxHeight: '150px',
                      overflowY: 'auto',
                      background: 'rgba(247,250,252,0.9)',
                      borderRadius: '15px',
                      border: '2px solid rgba(226,232,240,0.4)',
                      backdropFilter: 'blur(10px)'
                    }}>
                      {col.messages.map((msg) => (
                        <li key={msg.id} style={{
                          marginBottom: '0.75rem',
                          fontSize: '14px',
                          lineHeight: '1.5',
                          padding: '0.75rem',
                          background: 'rgba(255,255,255,0.7)',
                          borderRadius: '12px',
                          border: '1px solid rgba(226,232,240,0.3)'
                        }}>
                          <b style={{ color: '#667eea', fontWeight: '700' }}>{msg.author.name}:</b>{' '}
                          {editingMessageId === msg.id ? (
                            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <input
                                value={editingMessageContent}
                                onChange={(e) => setEditingMessageContent(e.target.value)}
                                style={{
                                  flex: 1,
                                  padding: '0.5rem',
                                  fontSize: '13px',
                                  borderRadius: '8px',
                                  border: '1px solid #E2E8F0',
                                  background: 'rgba(255,255,255,0.9)'
                                }}
                              />
                              <button onClick={() => handleEditMessage(msg.id)} style={{ 
                                background: 'rgba(72,187,120,0.2)', 
                                border: 'none', 
                                borderRadius: '6px', 
                                padding: '0.25rem 0.5rem',
                                cursor: 'pointer'
                              }}>✅</button>
                              <button onClick={() => setEditingMessageId(null)} style={{ 
                                background: 'rgba(239,68,68,0.2)', 
                                border: 'none', 
                                borderRadius: '6px', 
                                padding: '0.25rem 0.5rem',
                                cursor: 'pointer'
                              }}>❌</button>
                            </div>
                          ) : (
                            <div>
                              <span style={{ color: '#4A5568' }}>{msg.content}</span>
                              {meData?.me?.id === msg.author.id && (
                                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.25rem' }}>
                                  <button
                                    onClick={() => {
                                      setEditingMessageId(msg.id);
                                      setEditingMessageContent(msg.content);
                                    }}
                                    style={{ 
                                      background: 'rgba(102,126,234,0.15)', 
                                      border: '1px solid rgba(102,126,234,0.2)',
                                      borderRadius: '6px', 
                                      padding: '0.25rem 0.5rem',
                                      cursor: 'pointer',
                                      fontSize: '12px'
                                    }}
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    onClick={() => handleDeleteMessage(msg.id)}
                                    style={{ 
                                      background: 'rgba(239,68,68,0.15)', 
                                      border: '1px solid rgba(239,68,68,0.2)',
                                      borderRadius: '6px', 
                                      padding: '0.25rem 0.5rem',
                                      cursor: 'pointer',
                                      fontSize: '12px'
                                    }}
                                  >
                                    🗑️
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="💭 Votre message"
                      style={{
                        width: '90%',
                        padding: '0.75rem',
                        border: '2px solid #E2E8F0',
                        borderRadius: '12px',
                        fontSize: '14px',
                        marginBottom: '0.75rem',
                        outline: 'none',
                        resize: 'vertical',
                        minHeight: '80px',
                        background: 'rgba(255,255,255,0.9)',
                        transition: 'all 0.3s ease'
                      }}
                    />
                    <button 
                      onClick={handleAddMessage}
                      style={{
                        width: '100%',
                        background: 'linear-gradient(135deg, #38A169 0%, #2F855A 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '0.75rem',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 4px 12px rgba(56,161,105,0.3)',
                        marginBottom: '1rem'
                      }}
                    >
                      📤 Envoyer
                    </button>
                    {/* Export de la collection sélectionnée */}
                    <div style={{ 
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: '0.8rem',
                      marginBottom: '1.5rem'
                    }}>
                      <h3 style={{
                        color: '#2D3748',
                        fontSize: '18px',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        margin: 0
                      }}>📥 Export Feeds</h3>

                      <div style={{ 
                        display: 'flex', 
                        gap: '0.8rem', 
                        alignItems: 'center' 
                      }}>
                        <select
                          value={exportFormat || 'opml'}
                          onChange={(e) => setExportFormat(e.target.value)}
                          style={{
                            flex: '0 0 170px',
                            padding: '0.6rem 0.9rem',
                            border: '1px solid #CBD5E0',
                            borderRadius: '8px',
                            background: 'white',
                            fontSize: '14px',
                            fontWeight: 500,
                            color: '#2D3748',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="opml">OPML</option>
                          <option value="json">JSON</option>
                          <option value="csv">CSV</option>
                        </select>

                        <button
                          onClick={() => handleExport(exportFormat || 'opml')}
                          style={{
                            background: 'linear-gradient(135deg, #ED8936 0%, #DD6B20 100%)',
                            color: '#fff',
                            border: 'none',
                            padding: '0.65rem 1.1rem',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 600,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                            transition: 'all 0.2s ease-in-out'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                          onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                        >
                          ⬇️ Télécharger
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>

        </aside>

        {/* ARTICLES */}
        <section className="article-section" style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <input
              placeholder="🔍 Recherche..."
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
                padding: '1.2rem 2rem',
                border: 'none',
                borderRadius: '25px',
                fontSize: '16px',
                fontWeight: '400',
                outline: 'none',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                background: 'linear-gradient(145deg, rgba(255,255,255,0.95), rgba(248,250,252,0.9))',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)',
                color: '#2D3748',
                letterSpacing: '0.3px'
              }}
              onFocus={(e) => {
                e.target.style.boxShadow = '0 12px 40px rgba(102,126,234,0.15), 0 0 0 3px rgba(102,126,234,0.1), inset 0 1px 0 rgba(255,255,255,0.9)';
                e.target.style.transform = 'translateY(-3px)';
                e.target.style.background = 'linear-gradient(145deg, rgba(255,255,255,1), rgba(251,253,255,0.95))';
              }}
              onBlur={(e) => {
                e.target.style.boxShadow = '0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)';
                e.target.style.transform = 'translateY(0)';
                e.target.style.background = 'linear-gradient(145deg, rgba(255,255,255,0.95), rgba(248,250,252,0.9))';
              }}
            />

            <button
              onClick={() => setShowFilters(v => !v)}
              style={{
                background: showFilters
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : 'linear-gradient(145deg, rgba(255,255,255,0.95), rgba(248,250,252,0.9))',
                color: showFilters ? 'white' : '#4A5568',
                border: 'none',
                padding: '1.2rem 1.8rem',
                borderRadius: '25px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: showFilters
                  ? '0 8px 32px rgba(102,126,234,0.25), inset 0 1px 0 rgba(255,255,255,0.2)'
                  : '0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)',
                backdropFilter: 'blur(20px)',
                letterSpacing: '0.3px'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-3px)';
                if (showFilters) {
                  e.target.style.boxShadow = '0 16px 48px rgba(102,126,234,0.35), inset 0 1px 0 rgba(255,255,255,0.3)';
                } else {
                  e.target.style.boxShadow = '0 12px 40px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.9)';
                }
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = showFilters
                  ? '0 8px 32px rgba(102,126,234,0.25), inset 0 1px 0 rgba(255,255,255,0.2)'
                  : '0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)';
              }}
            >
              {showFilters ? '⬆️ Masquer filtres' : '🎛️ Filtres'}
            </button>

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
                padding: '1.2rem 2.5rem',
                borderRadius: '25px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 8px 32px rgba(102,126,234,0.25), inset 0 1px 0 rgba(255,255,255,0.2)',
                letterSpacing: '0.3px',
                textShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-3px)';
                e.target.style.boxShadow = '0 16px 48px rgba(102,126,234,0.4), inset 0 1px 0 rgba(255,255,255,0.3)';
                e.target.style.background = 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 8px 32px rgba(102,126,234,0.25), inset 0 1px 0 rgba(255,255,255,0.2)';
                e.target.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
              }}
            >
              🔎 Rechercher
            </button>
          </div>

          {showFilters && (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1.2rem',
              padding: '2rem 0.5rem 0.5rem',
              marginTop: '1rem',
              background: 'linear-gradient(145deg, rgba(255,255,255,0.4), rgba(248,250,252,0.3))',
              backdropFilter: 'blur(20px)',
              borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.2)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 4px 24px rgba(0,0,0,0.06)'
            }}>
              <select 
                value={selectedSource} 
                onChange={e => setSelectedSource(e.target.value)}
                style={{
                  padding: '0.8rem 1.2rem',
                  borderRadius: '15px',
                  border: 'none',
                  background: 'linear-gradient(145deg, rgba(255,255,255,0.9), rgba(248,250,252,0.8))',
                  color: '#4A5568',
                  fontSize: '15px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.7)',
                  outline: 'none',
                  minWidth: '140px'
                }}
              >
                <option value="">Toutes les sources</option>
                {(collectionsData?.collections || [])
                  .flatMap(col => col.feeds || [])
                  .map(feed => (
                    <option key={feed.id} value={feed.id}>{feed.title}</option>
                  ))}
              </select>

              <select 
                value={selectedTag} 
                onChange={e => setSelectedTag(e.target.value)}
                style={{
                  padding: '0.8rem 1.2rem',
                  borderRadius: '15px',
                  border: 'none',
                  background: 'linear-gradient(145deg, rgba(255,255,255,0.9), rgba(248,250,252,0.8))',
                  color: '#4A5568',
                  fontSize: '15px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.7)',
                  outline: 'none',
                  minWidth: '130px'
                }}
              >
                <option value="">Tous les tags</option>
                {(tagData?.allTags || []).map(tag => (
                  <option key={tag} value={tag}>#{tag}</option>
                ))}
              </select>

              <select 
                value={selectedCategory} 
                onChange={e => setSelectedCategory(e.target.value)}
                style={{
                  padding: '0.8rem 1.2rem',
                  borderRadius: '15px',
                  border: 'none',
                  background: 'linear-gradient(145deg, rgba(255,255,255,0.9), rgba(248,250,252,0.8))',
                  color: '#4A5568',
                  fontSize: '15px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.7)',
                  outline: 'none',
                  minWidth: '160px'
                }}
              >
                <option value="">Toutes les catégories</option>
                {(categoryData?.allCategories || []).map(cat => (
                  <option key={cat} value={cat}>[{cat}]</option>
                ))}
              </select>

              <select
                value={onlyUnread === null ? '' : (onlyUnread ? 'unread' : 'read')}
                onChange={e => {
                  const v = e.target.value;
                  setOnlyUnread(v === '' ? null : v === 'unread');
                }}
                style={{
                  padding: '0.8rem 1.2rem',
                  borderRadius: '15px',
                  border: 'none',
                  background: 'linear-gradient(145deg, rgba(255,255,255,0.9), rgba(248,250,252,0.8))',
                  color: '#4A5568',
                  fontSize: '15px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.7)',
                  outline: 'none',
                  minWidth: '130px'
                }}
              >
                <option value="">Tous les statuts</option>
                <option value="unread">Non lus</option>
                <option value="read">Lus</option>
              </select>

              <select
                value={onlyFavorites === null ? '' : (onlyFavorites ? 'fav' : 'nofav')}
                onChange={e => {
                  const v = e.target.value;
                  setOnlyFavorites(v === '' ? null : v === 'fav');
                }}
                style={{
                  padding: '0.8rem 1.2rem',
                  borderRadius: '15px',
                  border: 'none',
                  background: 'linear-gradient(145deg, rgba(255,255,255,0.9), rgba(248,250,252,0.8))',
                  color: '#4A5568',
                  fontSize: '15px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.7)',
                  outline: 'none',
                  minWidth: '120px'
                }}
              >
                <option value="">Tous</option>
                <option value="fav">Favoris</option>
                <option value="nofav">Non Favoris</option>
              </select>

              <button 
                onClick={handleSearch}
                style={{
                  padding: '0.8rem 1.5rem',
                  borderRadius: '15px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 16px rgba(72,187,120,0.25), inset 0 1px 0 rgba(255,255,255,0.2)',
                  letterSpacing: '0.2px',
                  textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 8px 24px rgba(72,187,120,0.35), inset 0 1px 0 rgba(255,255,255,0.3)';
                  e.target.style.background = 'linear-gradient(135deg, #38a169 0%, #2f855a 100%)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 16px rgba(72,187,120,0.25), inset 0 1px 0 rgba(255,255,255,0.2)';
                  e.target.style.background = 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)';
                }}
              >
                🔍 Filtrer
              </button>
            </div>
          )}
          </div>


          {!myPriv.canRead ? (
            <div style={{ padding: '1rem', color: '#C05621', background: 'rgba(254,235,200,0.6)', borderRadius: '12px', border: '1px solid #F6AD55' }}>
              Accès restreint: vous n’avez pas le privilège de lecture pour cette collection.
            </div>
          ) : null}

          {articlesData && articlesData.collection && (
            <>
              <h2 style={{
                color: '#2D3748',
                fontSize: '2rem',
                fontWeight: '800',
                marginBottom: '2rem',
                borderBottom: '4px solid #667eea',
                paddingBottom: '1rem',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                📰 Articles – {articlesData.collection.name}
              </h2>

              {selectedFeed && (() => {
                const feedInfo = collectionsData?.collections
                  ?.find(col => col.id === selectedCollection)
                  ?.feeds?.find(f => f.id === selectedFeed);

                return feedInfo ? (
                  <div style={{ 
                    marginBottom: '2rem',
                    padding: '1.5rem',
                    background: 'rgba(255,255,255,0.9)',
                    borderRadius: '20px',
                    border: '2px solid rgba(226,232,240,0.4)',
                    boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
                    backdropFilter: 'blur(10px)'
                  }}>
                    <h3 style={{ 
                      fontSize: '1.5rem', 
                      marginBottom: '1rem',
                      color: '#2D3748',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>📡 Flux : {feedInfo.title}</h3>
                    <div style={{ marginBottom: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span style={{ fontWeight: '600', color: '#4A5568' }}>🏷️ Tags :</span>
                      {(feedInfo.tags || []).map((t, i) => (
                        <span key={i} style={{ 
                          background: 'rgba(102,126,234,0.15)',
                          color: '#667eea',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '12px',
                          fontSize: '14px',
                          fontWeight: '600',
                          border: '1px solid rgba(102,126,234,0.2)'
                        }}>#{t}</span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span style={{ fontWeight: '600', color: '#4A5568' }}>📂 Catégories :</span>
                      {(feedInfo.categories || []).map((c, i) => (
                        <span key={i} style={{ 
                          background: 'rgba(72,187,120,0.15)',
                          color: '#48BB78',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '12px',
                          fontSize: '14px',
                          fontWeight: '600',
                          border: '1px solid rgba(72,187,120,0.2)'
                        }}>[{c}]</span>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

              
              <div style={{
                display: 'grid',
                gap: '2rem'
              }}>
                {articlesData.collection.articles.map((article) => (
                  <div key={article.id} style={{
                    background: 'rgba(255,255,255,0.95)',
                    borderRadius: '20px',
                    padding: '2rem',
                    border: '2px solid rgba(226,232,240,0.4)',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
                    transition: 'all 0.3s ease',
                    backdropFilter: 'blur(15px)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 15px 40px rgba(0,0,0,0.12)';
                    e.currentTarget.style.borderColor = 'rgba(102,126,234,0.3)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.08)';
                    e.currentTarget.style.borderColor = 'rgba(226,232,240,0.4)';
                  }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '4px',
                      background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
                    }}></div>

                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                      marginBottom: '2rem'
                    }}>
                      <h3 style={{ 
                        margin: '0 0 0.5rem 0',
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        lineHeight: '1.3'
                      }}> 
                        <a 
                          href={article.link} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          style={{ 
                            textDecoration: 'none', 
                            color: '#2D3748',
                            transition: 'color 0.2s ease'
                          }}
                          onMouseOver={(e) => e.target.style.color = '#667eea'}
                          onMouseOut={(e) => e.target.style.color = '#2D3748'}
                        >
                          {article.title}
                        </a>
                      </h3>

                      {article.author && (
                        <div style={{ 
                          fontSize: '1rem', 
                          color: '#718096', 
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          ✍️ par <span style={{ color: '#4A5568', fontWeight: '600' }}>{article.author}</span>
                        </div>
                      )}

                    {article.content && (
                      <div style={{ 
                        marginTop: '1rem',
                        padding: '1.5rem',
                        background: 'rgba(248,250,252,0.8)',
                        borderRadius: '15px',
                        border: '1px solid rgba(226,232,240,0.3)',
                        fontSize: '15px',
                        lineHeight: '1.6',
                        color: '#4A5568'
                      }}>
                        {article.content.substring(0, 400)}...
                      </div>
                    )}
                    
                    <div style={{ 
                      marginTop: '1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      fontSize: '15px',
                      fontWeight: '600'
                    }}>
                      <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        borderRadius: '15px',
                        background: article.isRead ? 'rgba(72,187,120,0.15)' : 'rgba(245,101,101,0.15)',
                        color: article.isRead ? '#38A169' : '#E53E3E',
                        border: `1px solid ${article.isRead ? 'rgba(72,187,120,0.2)' : 'rgba(245,101,101,0.2)'}`
                      }}>
                        {article.isRead ? "✅ Lu" : "📄 Non lu"}
                      </span>
                      {article.isFavorite && (
                        <span style={{ 
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem 1rem',
                          borderRadius: '15px',
                          background: 'rgba(245,158,11,0.15)',
                          color: '#D97706',
                          border: '1px solid rgba(245,158,11,0.2)'
                        }}>
                          ⭐ Favori
                        </span>
                      )}
                    </div>
                      
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button 
                          onClick={() => markRead({ variables: { articleId: article.id, read: !article.isRead } })}
                          style={{
                            background: article.isRead ? 'rgba(107,114,128,0.15)' : 'linear-gradient(135deg, #48BB78 0%, #38A169 100%)',
                            color: article.isRead ? '#6B7280' : 'white',
                            border: article.isRead ? '2px solid rgba(107,114,128,0.2)' : 'none',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '15px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '600',
                            transition: 'all 0.3s ease',
                            boxShadow: article.isRead ? 'none' : '0 4px 15px rgba(72,187,120,0.3)'
                          }}
                          onMouseOver={(e) => {
                            e.target.style.transform = 'translateY(-2px)';
                            if (!article.isRead) e.target.style.boxShadow = '0 6px 20px rgba(72,187,120,0.4)';
                          }}
                          onMouseOut={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            if (!article.isRead) e.target.style.boxShadow = '0 4px 15px rgba(72,187,120,0.3)';
                          }}
                        >
                          {article.isRead ? "📖 Marquer non lu" : "✅ Marquer lu"}
                        </button>
                        <button 
                          onClick={() => markFav({ variables: { articleId: article.id, fav: !article.isFavorite } })}
                          style={{
                            background: article.isFavorite ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' : 'rgba(107,114,128,0.15)',
                            color: article.isFavorite ? 'white' : '#6B7280',
                            border: article.isFavorite ? 'none' : '2px solid rgba(107,114,128,0.2)',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '15px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '600',
                            transition: 'all 0.3s ease',
                            boxShadow: article.isFavorite ? '0 4px 15px rgba(245,158,11,0.3)' : 'none'
                          }}
                          onMouseOver={(e) => {
                            e.target.style.transform = 'translateY(-2px)';
                            if (article.isFavorite) e.target.style.boxShadow = '0 6px 20px rgba(245,158,11,0.4)';
                          }}
                          onMouseOut={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            if (article.isFavorite) e.target.style.boxShadow = '0 4px 15px rgba(245,158,11,0.3)';
                          }}
                        >
                          {article.isFavorite ? "⭐ Retirer favori" : "☆ Ajouter favori"}
                        </button>
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1.5rem',
                        color: '#718096',
                        fontSize: '15px',
                        fontWeight: '500'
                      }}>
                        <span style={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          padding: '0.5rem 1rem',
                          borderRadius: '15px',
                          fontSize: '13px',
                          fontWeight: '600',
                          boxShadow: '0 2px 8px rgba(102,126,234,0.3)'
                        }}>
                          📡 {article.feed.title}
                        </span>
                        <span style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.5rem',
                          color: '#6B7280'
                        }}>
                          🕒 {new Date(article.published).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    
                    <div style={{
                      borderTop: '2px solid rgba(226,232,240,0.4)',
                      paddingTop: '2rem',
                      background: 'rgba(248,250,252,0.5)',
                      margin: '0 -2rem -2rem -2rem',
                      padding: '2rem',
                      borderRadius: '0 0 18px 18px'
                    }}>
                      <h4 style={{ 
                        color: '#2D3748', 
                        fontSize: '1.25rem', 
                        fontWeight: '700', 
                        marginBottom: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>💬 Commentaires ({article.comments.length})</h4>
                      
                      <div style={{ marginBottom: '2rem', maxHeight: '200px', overflowY: 'auto' }}>
                        {article.comments.map((c) => (
                          <div key={c.id} style={{ 
                            background: 'rgba(255,255,255,0.8)', 
                            padding: '1.5rem', 
                            borderRadius: '15px', 
                            marginBottom: '1rem', 
                            border: '2px solid rgba(226,232,240,0.3)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                            backdropFilter: 'blur(5px)'
                          }}>
                            {editingCommentId === c.id ? (
                              <div>
                                <textarea
                                  value={editingContent}
                                  onChange={(e) => setEditingContent(e.target.value)}
                                  style={{ 
                                    width: '100%', 
                                    padding: '0.75rem', 
                                    marginBottom: '1rem',
                                    borderRadius: '10px',
                                    border: '2px solid #E2E8F0',
                                    fontSize: '14px',
                                    minHeight: '80px',
                                    background: 'rgba(255,255,255,0.9)',
                                    resize: 'vertical'
                                  }}
                                />
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                  <button onClick={() => handleEditComment(c.id)} style={{ 
                                    background: 'linear-gradient(135deg, #48BB78 0%, #38A169 100%)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: '600'
                                  }}>✅ Enregistrer</button>
                                  <button onClick={() => setEditingCommentId(null)} style={{ 
                                    background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: '600'
                                  }}>❌ Annuler</button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div style={{ fontSize: '15px', lineHeight: '1.6', marginBottom: '1rem' }}>
                                  <span style={{ 
                                    fontWeight: '700', 
                                    color: '#667eea', 
                                    marginRight: '0.75rem',
                                    fontSize: '14px'
                                  }}>👤 {c.author.name}:</span>
                                  <span style={{ color: '#4A5568' }}>{c.content}</span>
                                </div>
                                {meData?.me?.id === c.author.id && (
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                  <button onClick={() => { setEditingCommentId(c.id); setEditingContent(c.content); }} style={{ 
                                    background: 'rgba(102,126,234,0.15)',
                                    color: '#667eea',
                                    border: '1px solid rgba(102,126,234,0.2)',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    transition: 'all 0.2s ease'
                                  }}>✏️ Modifier</button>
                                  <button onClick={() => handleDeleteComment(c.id)} style={{ 
                                    background: 'rgba(239,68,68,0.15)',
                                    color: '#EF4444',
                                    border: '1px solid rgba(239,68,68,0.2)',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    transition: 'all 0.2s ease'
                                    }}>🗑️ Supprimer</button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {myPriv.canComment && (
                      <div style={{
                        display: 'flex',
                        gap: '1rem',
                        alignItems: 'flex-end'
                      }}>
                        <textarea
                          placeholder="💭 Ajouter un commentaire..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          style={{
                            flex: 1,
                            padding: '1rem',
                            border: '2px solid #E2E8F0',
                            borderRadius: '15px',
                            fontSize: '15px',
                            outline: 'none',
                            resize: 'vertical',
                            minHeight: '80px',
                            transition: 'all 0.3s ease',
                            background: 'rgba(255,255,255,0.9)',
                            backdropFilter: 'blur(5px)'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#667eea';
                            e.target.style.boxShadow = '0 4px 15px rgba(102,126,234,0.15)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#E2E8F0';
                            e.target.style.boxShadow = 'none';
                          }}
                        />
                        <button 
                          onClick={() => handleAddComment(article.id)}
                          style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '1rem 2rem',
                            borderRadius: '15px',
                            cursor: 'pointer',
                            fontSize: '15px',
                            fontWeight: '600',
                            transition: 'all 0.3s ease',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 4px 15px rgba(102,126,234,0.3)'
                          }}
                          onMouseOver={(e) => {
                            e.target.style.transform = 'translateY(-2px)';
                            e.target.style.boxShadow = '0 6px 20px rgba(102,126,234,0.4)';
                          }}
                          onMouseOut={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 4px 15px rgba(102,126,234,0.3)';
                          }}
                        >
                          💬 Commenter
                        </button>
                      </div>
                      )}
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