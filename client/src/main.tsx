import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'

import App from './App'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import LinkPage from './pages/LinkPage'
import { ToastProvider } from './components/ToastProvider'

// Proteção simples
function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const token = localStorage.getItem('st_token')
    return token ? <>{children}</> : <Navigate to="/login" replace />
}

const qc = new QueryClient()

createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <QueryClientProvider client={qc}>
            <ToastProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route
                            path="/"
                            element={
                                <ProtectedRoute>
                                    <App />
                                </ProtectedRoute>
                            }
                        >
                            <Route index element={<Navigate to="/dashboard" replace />} />
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/link/:id" element={<LinkPage />} />
                        </Route>
                    </Routes>
                </BrowserRouter>
            </ToastProvider>
        </QueryClientProvider>
    </React.StrictMode>
)