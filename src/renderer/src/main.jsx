/**
 * Renderer entry point — src/renderer/src/main.jsx
 * Bootstraps the React app into the #root DOM node.
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
