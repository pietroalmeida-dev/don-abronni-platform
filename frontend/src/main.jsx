import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { limparDadosObsoletos } from './services/storage'

// Remove, uma vez, resíduos de localStorage de quem já usou a versão 100% local do
// site (antes da integração com o backend) — ver comentário em services/storage.js.
limparDadosObsoletos()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
