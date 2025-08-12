import React from 'react'
import { createRoot } from 'react-dom/client'
import AdminDashboard from './components/AdminDashboard.jsx'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AdminDashboard />
  </React.StrictMode>
)
