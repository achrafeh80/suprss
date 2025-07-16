import React, { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { Link, useNavigate } from 'react-router-dom';

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

        <p style={{
          textAlign: 'center',
          marginBottom: '16px',
          color: '#666',
          fontSize: '14px'
        }}>
          Ou{" "}
          <a
            href={`${process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace('/graphql', '') : ''}/auth/google`}
            style={{
              color: '#667eea',
              textDecoration: 'none',
              fontWeight: '600'
            }}
            onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
            onMouseOut={(e) => e.target.style.textDecoration = 'none'}
          >
            Connectez-vous avec Google
          </a>
        </p>
        
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