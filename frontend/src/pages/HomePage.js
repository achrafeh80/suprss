import React, { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { Link } from 'react-router-dom';

const REGISTER_MUTATION = gql`
  mutation Register($email: String!, $password: String!, $name: String) {
    register(email: $email, password: $password, name: $name) {
      id
      email
    }
  }
`;

function RegisterPage() {
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [register, { loading, error, data }] = useMutation(REGISTER_MUTATION);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return;
    try {
      await register({ variables: form });
    } catch {}
  };

  if (data) {
    // Inscription réussie
    return (
      <div className="auth-page">
        <h1>Inscription réussie</h1>
        <p>Votre compte a été créé. <Link to="/login">Connectez-vous</Link> pour continuer.</p>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <h1>Inscription</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Nom :</label>
          <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label>Email :</label>
          <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div>
          <label>Mot de passe :</label>
          <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
        </div>
        {error && <p className="error">Erreur: {error.message}</p>}
        <button type="submit" disabled={loading}>Créer un compte</button>
      </form>
      <p><Link to="/login">Retour à la connexion</Link></p>
    </div>
  );
}

export default RegisterPage;
