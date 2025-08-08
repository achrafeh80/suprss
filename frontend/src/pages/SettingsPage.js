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
  useEffect(() => {
  if (data?.me) {
    const userTheme = data.me.darkMode ? 'dark' : 'light';
    setTheme(userTheme);
    localStorage.setItem('theme', userTheme);

    const size = data.me.fontSize === 'SMALL' ? 14 :
                 data.me.fontSize === 'MEDIUM' ? 16 :
                 data.me.fontSize === 'LARGE' ? 20 : 16;
    setFontSize(size);
    localStorage.setItem('fontSize', size.toString());
  }
}, [data]);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [form, setForm] = useState({darkMode: false,fontSize: 16});
  const [fontSize, setFontSize] = useState(parseInt(localStorage.getItem('fontSize') || '16'));
  const [changePassword] = useMutation(CHANGE_PASSWORD);
  const [deleteAccount] = useMutation(DELETE_ACCOUNT);
  const [updateSettings] = useMutation(UPDATE_SETTINGS);

  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }

    // Appliquer la taille de police
    document.body.classList.remove('font-small', 'font-medium', 'font-large');
    if (fontSize === 14) document.body.classList.add('font-small');
    else if (fontSize === 16) document.body.classList.add('font-medium');
    else if (fontSize === 18 || fontSize === 20) document.body.classList.add('font-large');
  }, [theme, fontSize]);

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
  const isDark = newTheme === 'dark';
  localStorage.setItem('theme', newTheme);
  if (isDark) {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }


  try {
    await updateSettings({ variables: { darkMode: isDark } }); // "true" ou "false" string !
  } catch (err) {
    console.error('Failed to update theme on server', err);
  }
};


const handleFontSizeChange = async (size) => {
  setFontSize(size);
  localStorage.setItem('fontSize', size.toString());
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
};




  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '600px',
        margin: '40px auto',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '50px',
        borderRadius: '24px',
        boxShadow: '0 30px 60px rgba(0,0,0,0.15), 0 10px 30px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <h1 style={{
          textAlign: 'center',
          color: '#2d3748',
          marginBottom: '40px',
          fontSize: '32px',
          fontWeight: '800',
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>Paramètres de {data.me.name || data.me.email}</h1>
        
        <div style={{
          backgroundColor: '#f8fafc',
          borderRadius: '16px',
          padding: '30px',
          marginBottom: '30px',
          border: '1px solid #e2e8f0'
        }}>
          <h2 style={{
            color: '#2d3748',
            fontSize: '24px',
            fontWeight: '700',
            marginBottom: '25px',
            textAlign: 'center'
          }}>Settings</h2>
          
          <div style={{
            marginBottom: '30px'
          }}>
            <h3 style={{
              color: '#4a5568',
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '20px',
              paddingBottom: '10px',
              borderBottom: '2px solid #e2e8f0'
            }}>Appearance</h3>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>
              <label style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '16px',
                fontWeight: '500',
                color: '#2d3748'
              }}>
                Theme:
                <select 
                  value={theme} 
                  onChange={e => handleThemeToggle(e.target.value)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '2px solid #e2e8f0',
                    backgroundColor: 'white',
                    fontSize: '16px',
                    fontWeight: '500',
                    color: '#2d3748',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </label>
              
              <label style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '16px',
                fontWeight: '500',
                color: '#2d3748'
              }}>
                Font Size:
                <select 
                  value={fontSize} 
                  onChange={e => handleFontSizeChange(parseInt(e.target.value))}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '2px solid #e2e8f0',
                    backgroundColor: 'white',
                    fontSize: '16px',
                    fontWeight: '500',
                    color: '#2d3748',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                >
                  <option value="14">Small</option>
                  <option value="16">Medium</option>
                  <option value="20">Large</option>
                </select>
              </label>
            </div>
          </div>
          
          <div>
            <h3 style={{
              color: '#4a5568',
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '20px',
              paddingBottom: '10px',
              borderBottom: '2px solid #e2e8f0'
            }}>Account</h3>
            
            <form onSubmit={handlePasswordChange} style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              marginBottom: '25px'
            }}>
              <div>
                <label style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '16px',
                  fontWeight: '500',
                  color: '#2d3748'
                }}>
                  Current Password: 
                  <input 
                    type="password" 
                    value={oldPassword} 
                    onChange={e => setOldPassword(e.target.value)} 
                    required 
                    style={{
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '2px solid #e2e8f0',
                      backgroundColor: 'white',
                      fontSize: '16px',
                      color: '#2d3748',
                      outline: 'none',
                      transition: 'all 0.3s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#667eea'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                </label>
              </div>
              <div>
                <label style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '16px',
                  fontWeight: '500',
                  color: '#2d3748'
                }}>
                  New Password: 
                  <input 
                    type="password" 
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                    required 
                    style={{
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '2px solid #e2e8f0',
                      backgroundColor: 'white',
                      fontSize: '16px',
                      color: '#2d3748',
                      outline: 'none',
                      transition: 'all 0.3s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#667eea'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                </label>
              </div>
              <button 
                type="submit"
                style={{
                  padding: '14px 24px',
                  backgroundColor: '#48bb78',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(72, 187, 120, 0.3)',
                  transform: 'translateY(0)'
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = '#38a169';
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 16px rgba(72, 187, 120, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = '#48bb78';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 12px rgba(72, 187, 120, 0.3)';
                }}
              >
                Change Password
              </button>
            </form>
            
            <button 
              onClick={handleDeleteAccount}
              style={{
                width: '100%',
                padding: '14px 24px',
                backgroundColor: '#f56565',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 12px rgba(245, 101, 101, 0.3)',
                transform: 'translateY(0)'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#e53e3e';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 16px rgba(245, 101, 101, 0.4)';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = '#f56565';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(245, 101, 101, 0.3)';
              }}
            >
              Delete Account
            </button>
          </div>
        </div>
        
        <div style={{
          display: 'flex',
          gap: '16px',
          marginTop: '30px'
        }}>
          <button 
            onClick={handleLogout}
            style={{
              flex: 1,
              padding: '16px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 12px rgba(220, 53, 69, 0.3)',
              transform: 'translateY(0)'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#c82333';
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 16px rgba(220, 53, 69, 0.4)';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#dc3545';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 12px rgba(220, 53, 69, 0.3)';
            }}
          >
            Se déconnecter
          </button>
          
          <button 
            onClick={() => navigate('/')}
            style={{
              flex: 1,
              padding: '16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 12px rgba(108, 117, 125, 0.3)',
              transform: 'translateY(0)'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#5a6268';
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 16px rgba(108, 117, 125, 0.4)';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#6c757d';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 12px rgba(108, 117, 125, 0.3)';
            }}
          >
            ⬅️ Retour
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;