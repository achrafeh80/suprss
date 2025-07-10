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

  if (loading) return <div>Chargement...</div>;
  if (!data || !data.me) return <div>Utilisateur non chargé.</div>;

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
    <div className="settings-page">
      <h1>Paramètres de {data.me.name || data.me.email}</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>
            <input type="checkbox" checked={form.darkMode} onChange={e => setForm({ ...form, darkMode: e.target.checked })} />
            Mode sombre
          </label>
        </div>
        <div>
          <label> Taille du texte :
            <select value={form.fontSize} onChange={e => setForm({ ...form, fontSize: e.target.value })}>
              <option value="SMALL">Petit</option>
              <option value="MEDIUM">Moyen</option>
              <option value="LARGE">Grand</option>
            </select>
          </label>
        </div>
        <button type="submit">Enregistrer</button>
      </form>
      <button className="logout-btn" onClick={handleLogout}>Se déconnecter</button>
      <button onClick={() => navigate('/')}>⬅️ Retour</button>
    </div>
  );
}

export default SettingsPage;
