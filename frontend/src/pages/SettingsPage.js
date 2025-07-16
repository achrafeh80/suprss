import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { useNavigate } from 'react-router-dom';

const GET_ME = gql`
  query GetMe {
    me {
      id
      email
      name
      darkMode
      fontSize
    }
  }
`;

const UPDATE_SETTINGS = gql`
  mutation UpdateSettings($darkMode: Boolean, $fontSize: FontSize) {
    updateSettings(darkMode: $darkMode, fontSize: $fontSize) {
      id
      darkMode
      fontSize
    }
  }
`;

function SettingsPage({ theme, setTheme, onLogout }) {
  const navigate = useNavigate();
  const { data, loading } = useQuery(GET_ME);
  const [updateSettings] = useMutation(UPDATE_SETTINGS);
  const [form, setForm] = useState({ darkMode: theme.darkMode, fontSize: theme.fontSize });

  useEffect(() => {
    if (data && data.me) {
      setForm({ darkMode: data.me.darkMode, fontSize: data.me.fontSize });
      // Appliquer les préférences actuelles de l'utilisateur dans le thème global
      setTheme({ darkMode: data.me.darkMode, fontSize: data.me.fontSize });
    }
  }, [data, setTheme]);

  if (loading) return <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    fontSize: '18px',
    color: '#667eea'
  }}>Chargement...</div>;
  
  if (!data || !data.me) return <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    fontSize: '18px',
    color: '#e74c3c'
  }}>Utilisateur non chargé.</div>;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await updateSettings({ variables: form });
      if (res.data.updateSettings) {
        // mettre à jour le thème global
        setTheme({ darkMode: res.data.updateSettings.darkMode, fontSize: res.data.updateSettings.fontSize });
      }
    } catch (err) {
      console.error("Erreur sauvegarde paramètres:", err);
    }
  };

  const handleLogout = () => {
    if (onLogout) onLogout();
    navigate('/login');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '500px',
        margin: '40px auto',
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '16px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(10px)'
      }}>
        <h1 style={{
          textAlign: 'center',
          color: '#333',
          marginBottom: '30px',
          fontSize: '28px',
          fontWeight: '700'
        }}>Paramètres de {data.me.name || data.me.email}</h1>
        
        <form onSubmit={handleSubmit}>
          <div style={{
            marginBottom: '24px',
            padding: '16px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e9ecef'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              fontSize: '16px',
              color: '#333'
            }}>
              <input 
                type="checkbox" 
                checked={form.darkMode} 
                onChange={e => setForm({ ...form, darkMode: e.target.checked })}
                style={{
                  marginRight: '12px',
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer'
                }}
              />
              Mode sombre
            </label>
          </div>
          
          <div style={{
            marginBottom: '32px',
            padding: '16px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e9ecef'
          }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              color: '#333',
              fontWeight: '600'
            }}>
              Taille du texte :
              <select 
                value={form.fontSize} 
                onChange={e => setForm({ ...form, fontSize: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '16px',
                  marginTop: '8px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="SMALL">Petit</option>
                <option value="MEDIUM">Moyen</option>
                <option value="LARGE">Grand</option>
              </select>
            </label>
          </div>
          
          <button 
            type="submit"
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.3s ease',
              marginBottom: '16px'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#218838'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#28a745'}
          >
            Enregistrer
          </button>
        </form>
        
        <div style={{
          display: 'flex',
          gap: '12px',
          marginTop: '24px'
        }}>
          <button 
            onClick={handleLogout}
            style={{
              flex: 1,
              padding: '14px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.3s ease'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
          >
            Se déconnecter
          </button>
          
          <button 
            onClick={() => navigate('/')}
            style={{
              flex: 1,
              padding: '14px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.3s ease'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#5a6268'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#6c757d'}
          >
            ⬅️ Retour
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;