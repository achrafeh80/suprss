import React, { useEffect, useState } from 'react';
import { ApolloClient, InMemoryCache, ApolloProvider, createHttpLink } from '@apollo/client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { setContext } from '@apollo/client/link/context';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import SettingsPage from './pages/SettingsPage';

const httpLink = createHttpLink({
  uri: process.env.REACT_APP_API_URL || 'http://localhost:4000/graphql',
  credentials: 'include',
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
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [theme, setTheme] = useState({ darkMode: false, fontSize: 'MEDIUM' });

  useEffect(() => {
     const storedTheme = localStorage.getItem('theme');           // "dark" | "light"
     const storedFont = parseInt(localStorage.getItem('fontSize') || '16', 10); // 14 | 16 | 18/20
     setTheme({
       darkMode: storedTheme === 'dark',
       fontSize: storedFont <= 14 ? 'SMALL' : (storedFont >= 20 ? 'LARGE' : 'MEDIUM'),
     });
   }, []);
 
   useEffect(() => {
     const onStorage = (e) => {
       if (e.key === 'theme' || e.key === 'fontSize') {
         const t = localStorage.getItem('theme');
         const f = parseInt(localStorage.getItem('fontSize') || '16', 10);
         setTheme({
           darkMode: t === 'dark',
           fontSize: f <= 14 ? 'SMALL' : (f >= 20 ? 'LARGE' : 'MEDIUM'),
         });
       }
     };
     window.addEventListener('storage', onStorage);
     return () => window.removeEventListener('storage', onStorage);
   }, []);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('token=')) {
      const newToken = hash.split('token=')[1];
      if (newToken) {
        localStorage.setItem('token', newToken);
        setToken(newToken);
      }
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (theme.darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    document.body.classList.remove('font-small', 'font-medium', 'font-large');
    if (theme.fontSize) {
      const sizeClass =
        theme.fontSize === 'SMALL'
          ? 'font-small'
          : theme.fontSize === 'LARGE'
          ? 'font-large'
          : 'font-medium';
      document.body.classList.add(sizeClass);
    }
    localStorage.setItem('theme', theme.darkMode ? 'dark' : 'light');
    localStorage.setItem(
      'fontSize',
      theme.fontSize === 'SMALL' ? '14' : theme.fontSize === 'LARGE' ? '20' : '16'
    );
  }, [theme]);


  useEffect(() => {
  if (token) {
    client.resetStore().catch(() => client.clearStore());
  } else {
    client.clearStore();
  }
}, [token]);

  

  return (
    <ApolloProvider client={client}>
      <Router>
        <Routes>
          {!token ? (
            <>
              {/* Routes publiques */}
              <Route path="/login" element={<LoginPage onLoginSuccess={(tok) => setToken(tok)} />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </>
          ) : (
            <>
              {/* Routes privées */}
              <Route path="/" element={<HomePage theme={theme} setTheme={setTheme} />} />
              <Route path="/settings" element={<SettingsPage theme={theme} setTheme={setTheme} onLogout={() => { localStorage.removeItem('token'); setToken(null); }} />} />
              {/* Ces routes ne doivent pas être accessibles si connecté */}
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="/register" element={<Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}
        </Routes>
      </Router>
    </ApolloProvider>
  );
}

export default App;
