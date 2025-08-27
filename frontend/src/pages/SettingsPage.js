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

function SettingsPage({ onLogout, setTheme: setAppTheme }) {
  const navigate = useNavigate();
  const { data, loading } = useQuery(GET_ME);

  const [activeTab, setActiveTab] = useState('appearance');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [localTheme, setLocalTheme] = useState(localStorage.getItem('theme') || 'light');
  const [fontSize, setFontSize] = useState(parseInt(localStorage.getItem('fontSize') || '16', 10));

  const [changePassword] = useMutation(CHANGE_PASSWORD);
  const [deleteAccount] = useMutation(DELETE_ACCOUNT);
  const [updateSettings] = useMutation(UPDATE_SETTINGS);

  useEffect(() => {
    if (data?.me) {
      const isDark = !!data.me.darkMode;
      const userTheme = isDark ? 'dark' : 'light';
      setLocalTheme(userTheme);
      localStorage.setItem('theme', userTheme);

      const size =
        data.me.fontSize === 'SMALL' ? 14 :
        data.me.fontSize === 'MEDIUM' ? 16 :
        data.me.fontSize === 'LARGE' ? 20 : 16;

      setFontSize(size);
      localStorage.setItem('fontSize', String(size));

      if (typeof setAppTheme === 'function') {
        setAppTheme({ darkMode: isDark, fontSize: data.me.fontSize });
      }
    }
  }, [data, setAppTheme]);

  useEffect(() => {
    if (localTheme === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }

    document.body.classList.remove('font-small', 'font-medium', 'font-large');
    if (fontSize === 14) document.body.classList.add('font-small');
    else if (fontSize === 16) document.body.classList.add('font-medium');
    else if (fontSize === 18 || fontSize === 20) document.body.classList.add('font-large');
  }, [localTheme, fontSize]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--text)' }}>
        Chargement...
      </div>
    );
  }

  if (!data || !data.me) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--text)' }}>
        Utilisateur non chargé.
      </div>
    );
  }

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
      setOldPassword('');
      setNewPassword('');
    } catch (err) {
      alert('Failed to change password: ' + err.message);
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Are you sure you want to permanently delete your account?')) {
      try {
        await deleteAccount();
        localStorage.clear();
        window.location.href = '/';
      } catch (err) {
        alert('Failed to delete account: ' + err.message);
      }
    }
  };

  const handleThemeToggle = async (newTheme) => {
    setLocalTheme(newTheme);
    const isDark = newTheme === 'dark';
    localStorage.setItem('theme', newTheme);

    if (isDark) document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');

    try {
      await updateSettings({ variables: { darkMode: isDark } });
    } catch (err) {
      console.error('Failed to update theme on server', err);
    }

    if (typeof setAppTheme === 'function') {
      const sizeEnum = fontSize <= 14 ? 'SMALL' : (fontSize >= 20 ? 'LARGE' : 'MEDIUM');
      setAppTheme({ darkMode: isDark, fontSize: sizeEnum });
    }
  };

  const handleFontSizeChange = async (size) => {
    setFontSize(size);
    localStorage.setItem('fontSize', String(size));

    document.body.classList.remove('font-small', 'font-medium', 'font-large');
    let fontSizeEnum = 'MEDIUM';
    if (size === 14) {
      document.body.classList.add('font-small');
      fontSizeEnum = 'SMALL';
    } else if (size === 16) {
      document.body.classList.add('font-medium');
      fontSizeEnum = 'MEDIUM';
    } else if (size === 18 || size === 20) {
      document.body.classList.add('font-large');
      fontSizeEnum = 'LARGE';
    }

    try {
      await updateSettings({ variables: { fontSize: fontSizeEnum } });
    } catch (err) {
      console.error('Failed to update font size on server', err);
    }

    if (typeof setAppTheme === 'function') {
      const isDark = (localTheme === 'dark');
      setAppTheme({ darkMode: isDark, fontSize: fontSizeEnum });
    }
  };

  return (
    <div className="settings-root" style={{ minHeight: '100vh', background: 'var(--bg)', padding: 20 }}>
      <div className="settings-page" style={{
        maxWidth: 640,
        margin: '40px auto',
        background: 'var(--panel)',
        color: 'inherit',
        padding: 32,
        borderRadius: 12,
        border: '1px solid var(--border)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
      }}>
        <h1 style={{
          textAlign: 'center',
          marginBottom: 24,
          fontSize: 28,
          fontWeight: 800
        }}>
          Paramètres de {data.me.name || data.me.email}
        </h1>

        <div style={{ 
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)', 
          border: '1px solid rgba(255,255,255,0.2)', 
          borderRadius: 16, 
          padding: 32, 
          marginBottom: 24,
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ 
            textAlign: 'center', 
            marginTop: 0, 
            marginBottom: 32,
            fontSize: 28,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>Settings</h2>

          {/* Onglets */}
          <div style={{
            display: 'flex',
            marginBottom: 32,
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: 4,
            gap: 4
          }}>
            <button
              onClick={() => setActiveTab('appearance')}
              style={{
                flex: 1,
                padding: '12px 20px',
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                background: activeTab === 'appearance' 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                  : 'transparent',
                color: activeTab === 'appearance' ? 'white' : 'inherit',
                boxShadow: activeTab === 'appearance' 
                  ? '0 4px 15px rgba(102,126,234,0.3)' 
                  : 'none'
              }}
              onMouseOver={(e) => {
                if (activeTab !== 'appearance') {
                  e.target.style.background = 'rgba(102,126,234,0.1)';
                }
              }}
              onMouseOut={(e) => {
                if (activeTab !== 'appearance') {
                  e.target.style.background = 'transparent';
                }
              }}
            >
              Appearance
            </button>
            <button
              onClick={() => setActiveTab('account')}
              style={{
                flex: 1,
                padding: '12px 20px',
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                background: activeTab === 'account' 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                  : 'transparent',
                color: activeTab === 'account' ? 'white' : 'inherit',
                boxShadow: activeTab === 'account' 
                  ? '0 4px 15px rgba(102,126,234,0.3)' 
                  : 'none'
              }}
              onMouseOver={(e) => {
                if (activeTab !== 'account') {
                  e.target.style.background = 'rgba(102,126,234,0.1)';
                }
              }}
              onMouseOut={(e) => {
                if (activeTab !== 'account') {
                  e.target.style.background = 'transparent';
                }
              }}
            >
              Account
            </button>
          </div>

          {/* Contenu des onglets */}
          {activeTab === 'appearance' && (
            <div style={{
              animation: 'fadeIn 0.3s ease-in-out'
            }}>
              <h3 style={{
                fontSize: 20,
                fontWeight: 600,
                marginBottom: 20,
                paddingBottom: 12,
                borderBottom: '2px solid transparent',
                borderImage: 'linear-gradient(90deg, #667eea, #764ba2) 1',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>Appearance</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <label style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 10, 
                  fontWeight: 500,
                  color: 'inherit'
                }}>
                  Theme:
                  <select
                    value={localTheme}
                    onChange={e => handleThemeToggle(e.target.value)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 12,
                      border: '2px solid transparent',
                      background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #667eea, #764ba2) border-box',
                      color: 'inherit',
                      cursor: 'pointer',
                      outline: 'none',
                      fontSize: 14,
                      fontWeight: 500,
                      transition: 'all 0.3s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 8px 25px rgba(102,126,234,0.3)';
                    }}
                    onBlur={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </label>

                <label style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 10, 
                  fontWeight: 500,
                  color: 'inherit'
                }}>
                  Font Size:
                  <select
                    value={fontSize}
                    onChange={e => handleFontSizeChange(parseInt(e.target.value, 10))}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 12,
                      border: '2px solid transparent',
                      background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #667eea, #764ba2) border-box',
                      color: 'inherit',
                      cursor: 'pointer',
                      outline: 'none',
                      fontSize: 14,
                      fontWeight: 500,
                      transition: 'all 0.3s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 8px 25px rgba(102,126,234,0.3)';
                    }}
                    onBlur={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <option value="14">Small</option>
                    <option value="16">Medium</option>
                    <option value="20">Large</option>
                  </select>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div style={{
              animation: 'fadeIn 0.3s ease-in-out'
            }}>
              <h3 style={{
                fontSize: 20,
                fontWeight: 600,
                marginBottom: 20,
                paddingBottom: 12,
                borderBottom: '2px solid transparent',
                borderImage: 'linear-gradient(90deg, #667eea, #764ba2) 1',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>Account</h3>

              <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 24 }}>
                <div>
                  <label style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 10, 
                    fontWeight: 500,
                    color: 'inherit'
                  }}>
                    Current Password:
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={e => setOldPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      style={{
                        padding: '12px 16px',
                        borderRadius: 12,
                        border: '2px solid transparent',
                        background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #667eea, #764ba2) border-box',
                        color: 'inherit',
                        outline: 'none',
                        fontSize: 14,
                        transition: 'all 0.3s ease'
                      }}
                      onFocus={(e) => {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 8px 25px rgba(102,126,234,0.3)';
                      }}
                      onBlur={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </label>
                </div>
                <div>
                  <label style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 10, 
                    fontWeight: 500,
                    color: 'inherit'
                  }}>
                    New Password:
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      style={{
                        padding: '12px 16px',
                        borderRadius: 12,
                        border: '2px solid transparent',
                        background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #667eea, #764ba2) border-box',
                        color: 'inherit',
                        outline: 'none',
                        fontSize: 14,
                        transition: 'all 0.3s ease'
                      }}
                      onFocus={(e) => {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 8px 25px rgba(102,126,234,0.3)';
                      }}
                      onBlur={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  style={{
                    padding: '12px 20px',
                    background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 6px 20px rgba(72,187,120,0.4)',
                    fontSize: 14,
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseOver={(e) => { 
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(72,187,120,0.5)';
                  }}
                  onMouseOut={(e) => { 
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(72,187,120,0.4)';
                  }}
                >
                  Change Password
                </button>
              </form>

              <button
                onClick={handleDeleteAccount}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  background: 'linear-gradient(135deg, #f56565 0%, #e53e3e 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(245,101,101,0.4)',
                  fontSize: 14,
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseOver={(e) => { 
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(245,101,101,0.5)';
                }}
                onMouseOut={(e) => { 
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(245,101,101,0.4)';
                }}
              >
                Delete Account
              </button>
            </div>
          )}

          <style jsx>{`
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(10px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button
            onClick={handleLogout}
            style={{
              padding: '10px 16px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(220,53,69,0.3)'
            }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#c82333'; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#dc3545'; }}
          >
            Se déconnecter
          </button>

          <button
            onClick={() => navigate('/')}
            style={{
              padding: '10px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(108,117,125,0.3)'
            }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#5a6268'; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#6c757d'; }}
          >
            ⬅️ Retour
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;