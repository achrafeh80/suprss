import React, { useState, useEffect } from 'react';
import { useMutation, gql } from '@apollo/client';
import { Link, useNavigate } from 'react-router-dom';

const REGISTER_MUTATION = gql`
  mutation Register($email: String!, $password: String!, $name: String) {
    register(email: $email, password: $password, name: $name) {
      token
      user {
        id
        email
        name
      }
    }
  }
`;

function RegisterPage() {
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [register, { loading, error, data }] = useMutation(REGISTER_MUTATION);
  const navigate = useNavigate();

  useEffect(() => {
    if (data?.register?.token) {
      localStorage.setItem('token', data.register.token);
      navigate('/');
    }
  }, [data, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const { data } = await register({
        variables: {
          email: form.email,
          password: form.password,
          name: form.name,
        },
      });

      if (data?.register?.token) {
        localStorage.setItem("token", data.register.token);
        window.location.href = "/";
      } else {
        console.error("Register mutation returned no data", data);
      }
    } catch (err) {
      console.error(err);
      alert(err.message);
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
        }}>Inscription</h1>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#555',
              fontWeight: '600',
              fontSize: '14px'
            }}>Nom :</label>
            <input 
              type="text" 
              value={form.name} 
              onChange={e => setForm({ ...form, name: e.target.value })}
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
          }}>Erreur: {error.message}</p>}
          
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
            Créer un compte
          </button>
        </form>
        
        <p style={{
          textAlign: 'center',
          color: '#666',
          fontSize: '14px'
        }}>
          <Link 
            to="/login"
            style={{
              color: '#667eea',
              textDecoration: 'none',
              fontWeight: '600'
            }}
            onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
            onMouseOut={(e) => e.target.style.textDecoration = 'none'}
          >
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;