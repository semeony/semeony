import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'
import { registerSW } from 'virtual:pwa-register'

registerSW({
  immediate: true,
  onRegisterError(error) {
    console.error('Daywell could not register offline support.', error)
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
