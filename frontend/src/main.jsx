import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

const globalStyles = `
  :root {
    --primary: #E8481C;
    --primary-light: #FEF0EC;
    --primary-hover: #D03D14;
    --bg: #FFFBF8;
    --white: #FFFFFF;
    --text: #1A1206;
    --text-2: #6B6560;
    --text-3: #A89F96;
    --border: #EAE6E1;
    --shadow-sm: 0 1px 3px rgba(26,18,6,0.06), 0 2px 8px rgba(26,18,6,0.04);
    --shadow-md: 0 2px 8px rgba(26,18,6,0.06), 0 8px 24px rgba(26,18,6,0.06);
    --radius: 14px;
    --radius-sm: 8px;
    --green: #16A34A;
    --green-light: #F0FDF4;
    --amber: #D97706;
    --amber-light: #FFFBEB;
    --red: #DC2626;
    --red-light: #FEF2F2;
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

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
`

const style = document.createElement('style')
style.textContent = globalStyles
document.head.appendChild(style)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
