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
    <div className="auth-page">
      <h1>Connexion</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email :</label>
          <input
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
        <div>
          <label>Mot de passe :</label>
          <input
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>
        {error && <p className="error">Échec de la connexion: {error.message}</p>}
        <button type="submit" disabled={loading}>
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </form>

      <p>
        Ou{" "}
        <a
          href={`${process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace('/graphql', '') : ''}/auth/google`}
        >
          Connectez-vous avec Google
        </a>
      </p>
      <p>
        <Link to="/register">Créer un compte</Link>
      </p>
    </div>
  );
}

export default LoginPage;
