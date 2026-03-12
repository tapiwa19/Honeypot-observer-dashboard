import React from 'react'
import ReactDOM from 'react-dom/client'

// initialize API settings (baseURL + interceptors)
import './services/api';

import App from './App.tsx'
import './index.css'  // ← THIS LINE IS CRITICAL!

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)