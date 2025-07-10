import React, { useEffect, useState } from 'react';
import { ApolloClient, InMemoryCache, ApolloProvider, createHttpLink } from '@apollo/client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { setContext } from '@apollo/client/link/context';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import SettingsPage from './pages/SettingsPage';

// Configuration du client Apollo pour se connecter à l'API GraphQL
const httpLink = createHttpLink({
  uri: process.env.REACT_APP_API_URL || '/graphql'
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      ...headers,
      Authorization: token ? `Bearer ${token}` : ""
    }
  };
});


const client = new ApolloClient({
  link: new HttpLink({
    uri: process.env.REACT_APP_API_URL || 'http://localhost:4000/graphql',
    credentials: 'include',
  }),
  cache: new InMemoryCache(),
});


function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [theme, setTheme] = useState({ darkMode: false, fontSize: 'MEDIUM' });

  useEffect(() => {
    // Vérifier si redirection OAuth nous a donné un token dans l'URL
    const hash = window.location.hash;
    if (hash.includes('token=')) {
      const newToken = hash.split('token=')[1];
      if (newToken) {
        localStorage.setItem('token', newToken);
        setToken(newToken);
      }
      // Nettoyer le fragment de l'URL
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    // Appliquer le thème (classes CSS sur le body)
    if (theme.darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    document.body.classList.remove('font-small', 'font-medium', 'font-large');
    if (theme.fontSize) {
      const sizeClass = theme.fontSize === 'SMALL' ? 'font-small'
                      : theme.fontSize === 'LARGE' ? 'font-large'
                      : 'font-medium';
      document.body.classList.add(sizeClass);
    }
  }, [theme]);

  return (
    <ApolloProvider client={client}>
      <Router>
        <Routes>
          {!token ? (
            <>
              <Route path="/login" element={<LoginPage onLoginSuccess={(tok) => { setToken(tok); }} />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </>
          ) : (
            <>
              <Route path="/" element={<HomePage theme={theme} setTheme={setTheme} />} />
              <Route path="/settings" element={<SettingsPage theme={theme} setTheme={setTheme} onLogout={() => { localStorage.removeItem('token'); setToken(null); }} />} />
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="/register" element={<Navigate to="/" replace />} />
            </>
          )}
        </Routes>
      </Router>
    </ApolloProvider>
  );
}

export default App;
