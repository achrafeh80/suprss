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
  const CHANGE_PASSWORD = gql`
    mutation ChangePassword($oldPass: String!, $newPass: String!) {
      changePassword(oldPassword: $oldPass, newPassword: $newPass)
    }
  `;
  const DELETE_ACCOUNT = gql`
    mutation DeleteAccount {
      deleteAccount
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

function SettingsPage({ onLogout }) {
  const navigate = useNavigate();
  const { data, loading } = useQuery(GET_ME);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [form, setForm] = useState({darkMode: false,fontSize: 16});
  const [fontSize, setFontSize] = useState(parseInt(localStorage.getItem('fontSize') || '16'));
  const [changePassword] = useMutation(CHANGE_PASSWORD);
  const [deleteAccount] = useMutation(DELETE_ACCOUNT);
  const [updateSettings] = useMutation(UPDATE_SETTINGS);

  useEffect(() => {
    if (data && data.me) {
      setForm({ darkMode: data.me.darkMode, fontSize: data.me.fontSize });
      // Appliquer les préférences actuelles de l'utilisateur dans le thème global
      setTheme(data.me.darkMode ? 'dark' : 'light');
      setFontSize(parseInt(data.me.fontSize));
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


  const handleLogout = () => {
    if (onLogout) onLogout();
    navigate('/login');
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) return;
    try {
      await changePassword({ variables: { oldPass: oldPassword, newPass: newPassword } });
      alert('Password changed successfully.');
      setOldPassword(''); setNewPassword('');
    } catch (err) {
      alert('Failed to change password: ' + err.message);
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Are you sure you want to permanently delete your account?')) {
      try {
        await deleteAccount();
        // Clear local data and redirect to login
        localStorage.clear();
        window.location.href = '/login';
      } catch (err) {
        alert('Failed to delete account: ' + err.message);
      }
    }
  };

  const handleThemeToggle = async (newTheme) => {
    setTheme(newTheme);
    // Update localStorage and body class
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') document.body.classList.add('dark-theme');
    else document.body.classList.remove('dark-theme');
    // Save to server preferences
    try {
      await updateSettings({ variables: { theme: newTheme } });
    } catch (err) {
      console.error('Failed to update theme on server');
    }
  };

  const handleFontSizeChange = async (size) => {
    setFontSize(size);
    localStorage.setItem('fontSize', size.toString());
    document.body.style.fontSize = size + 'px';
    try {
      await updateSettings({ variables: { fontSize: size } });
    } catch (err) {
      console.error('Failed to update font size on server');
    }
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
        
<div className="settings-page">
      <h2>Settings</h2>
      <div>
        <h3>Appearance</h3>
        <label>
          Theme:
          <select value={theme} onChange={e => handleThemeToggle(e.target.value)}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <label>
          Font Size:
          <select value={fontSize} onChange={e => handleFontSizeChange(parseInt(e.target.value))}>
            <option value="14">Small</option>
            <option value="16">Medium</option>
            <option value="20">Large</option>
          </select>
        </label>
      </div>
      <div>
        <h3>Account</h3>
        <form onSubmit={handlePasswordChange}>
          <div>
            <label>Current Password: <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} required /></label>
          </div>
          <div>
            <label>New Password: <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required /></label>
          </div>
          <button type="submit">Change Password</button>
        </form>
        <button className="delete-account-btn" onClick={handleDeleteAccount}>Delete Account</button>
      </div>
    </div>
        
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