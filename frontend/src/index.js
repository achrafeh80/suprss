import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './style.css';

// index.js
const theme = localStorage.getItem('theme');
if (theme === 'dark') {
  document.body.classList.add('dark-mode');
}

const fontSize = parseInt(localStorage.getItem('fontSize') || '16');
document.body.classList.remove('font-small', 'font-medium', 'font-large');
if (fontSize === 14) document.body.classList.add('font-small');
else if (fontSize === 16) document.body.classList.add('font-medium');
else if (fontSize === 18 || fontSize === 20) document.body.classList.add('font-large');


const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
