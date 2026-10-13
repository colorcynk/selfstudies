import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/global.css'
import { ProgressProvider } from './shared/progress/ProgressProvider'

createRoot(document.getElementById('root')!).render(<React.StrictMode><ProgressProvider><App /></ProgressProvider></React.StrictMode>)
