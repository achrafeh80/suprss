import React, { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { Link, useNavigate } from 'react-router-dom';

const API_BASE =
  (process.env.REACT_APP_API_URL
    ? process.env.REACT_APP_API_URL.replace('/graphql', '')
    : 'http://localhost:4000');

const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        email
        name
        darkMode
        fontSize
      }
    }
  }
`;

function LoginPage({ onLoginSuccess }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });

  const [login, { loading, error }] = useMutation(LOGIN_MUTATION, {
    onCompleted: (data) => {
      if (data.login?.token) {
        localStorage.setItem('token', data.login.token);
        if (onLoginSuccess) onLoginSuccess(data.login.token);
        navigate('/'); 
      }
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return;
    try {
      await login({
        variables: {
          email: form.email,
          password: form.password,
        }
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '16px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px',
        backdropFilter: 'blur(10px)'
      }}>
        <h1 style={{
          textAlign: 'center',
          color: '#333',
          marginBottom: '30px',
          fontSize: '28px',
          fontWeight: '700'
        }}>Connexion</h1>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#555',
              fontWeight: '600',
              fontSize: '14px'
            }}>Email :</label>
            <input
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '16px',
                transition: 'border-color 0.3s ease',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
            />
          </div>
          
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#555',
              fontWeight: '600',
              fontSize: '14px'
            }}>Mot de passe :</label>
            <input
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '16px',
                transition: 'border-color 0.3s ease',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
            />
          </div>
          
          {error && <p style={{
            color: '#e74c3c',
            backgroundColor: '#fdf2f2',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px',
            border: '1px solid #fecaca'
          }}>Échec de la connexion: {error.message}</p>}
          
          <button 
            type="submit" 
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: loading ? '#ccc' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.3s ease',
              marginBottom: '20px'
            }}
            onMouseOver={(e) => !loading && (e.target.style.backgroundColor = '#5a67d8')}
            onMouseOut={(e) => !loading && (e.target.style.backgroundColor = '#667eea')}
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '14px', color: '#666', marginBottom: '16px' }}>
          Ou se connecter avec
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
          <a
            href={`${API_BASE}/auth/google`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              border: '1px solid #ddd',
              borderRadius: '12px',
              background: '#fff',
              fontWeight: 600,
              fontSize: '14px',
              color: '#444',
              textDecoration: 'none',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#f9f9f9')}
            onMouseOut={(e) => (e.currentTarget.style.background = '#fff')}
            aria-label="Connexion avec Google"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.6-9 19.6-20 0-1.3-.1-2.7-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.4 15.1 18.8 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.5 4 24 4 16.2 4 9.3 8.5 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.4 0 10.3-1.9 14-5.1l-6.5-5.3C29.3 35.6 26.7 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.6 5.1C9.3 39.5 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5.1-.1 8.3 6.4 8.3 6.4 2.4-2.2 4.2-5 5.3-8.2.5-1.3.7-2.7.7-4.2 0-1.3-.1-2.7-.4-3.5z"/>
            </svg>
            Google
          </a>

          <a
            href={`${API_BASE}/auth/github`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              border: '1px solid #ddd',
              borderRadius: '12px',
              background: '#fff',
              fontWeight: 600,
              fontSize: '14px',
              color: '#444',
              textDecoration: 'none',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#f9f9f9')}
            onMouseOut={(e) => (e.currentTarget.style.background = '#fff')}
            aria-label="Connexion avec GitHub"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 .5C5.73.5.5 5.74.5 12.02c0 5.1 3.29 9.42 7.86 10.95.58.11.79-.25.79-.56v-2.17c-3.2.7-3.87-1.54-3.87-1.54-.53-1.36-1.3-1.73-1.3-1.73-1.06-.73.08-.72.08-.72 1.17.08 1.78 1.2 1.78 1.2 1.04 1.78 2.73 1.27 3.4.97.11-.76.41-1.27.75-1.56-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.19-3.1-.12-.3-.52-1.51.11-3.14 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.63.23 2.84.11 3.14.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.41-5.25 5.69.42.36.8 1.09.8 2.21v3.28c0 .31.21.67.8.56A10.52 10.52 0 0 0 23.5 12c0-6.28-5.23-11.5-11.5-11.5z"/>
            </svg>
            GitHub
          </a>
        </div>


        <p style={{
          textAlign: 'center',
          color: '#666',
          fontSize: '14px'
        }}>
          <Link 
            to="/register"
            style={{
              color: '#667eea',
              textDecoration: 'none',
              fontWeight: '600'
            }}
            onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
            onMouseOut={(e) => e.target.style.textDecoration = 'none'}
          >
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;