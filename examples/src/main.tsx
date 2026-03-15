import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@inovua/reactdatagrid-community/index.css'
import './index.css'
import './themes/index.scss'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
