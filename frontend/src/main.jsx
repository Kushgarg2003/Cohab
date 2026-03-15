import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

const globalStyles = `
  :root {
    --primary: #E8481C;
    --primary-light: rgba(232,72,28,0.12);
    --primary-hover: #FF5A2C;
    --bg: #0C0C10;
    --surface: #16161D;
    --surface-2: #1F1F28;
    --white: #16161D;
    --text: #EEEEF5;
    --text-2: #8A8AA0;
    --text-3: #4A4A60;
    --border: #26263200;
    --border: #262632;
    --border-2: #34344400;
    --border-2: #343444;
    --shadow-sm: 0 1px 4px rgba(0,0,0,0.5);
    --shadow-md: 0 4px 24px rgba(0,0,0,0.6), 0 1px 4px rgba(0,0,0,0.4);
    --radius: 16px;
    --radius-sm: 10px;
    --green: #22C55E;
    --green-light: rgba(34,197,94,0.12);
    --amber: #F59E0B;
    --amber-light: rgba(245,158,11,0.12);
    --red: #EF4444;
    --red-light: rgba(239,68,68,0.12);
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    background: var(--bg);
    color: var(--text);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  button { font-family: inherit; }
  input, textarea { font-family: inherit; }

  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: var(--border-2); border-radius: 3px; }

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes slideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
`

const style = document.createElement('style')
style.textContent = globalStyles
document.head.appendChild(style)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
