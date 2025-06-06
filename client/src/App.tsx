import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import Login from './pages/login';
import Dashboard from './pages/dashboard';
import SaidasOperacionais from './pages/SaidasOperacionais';
import NotFound from './pages/not-found';
import FechamentoNovo from './pages/fechamento-novo';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/saidas-operacionais"
            element={
              <PrivateRoute>
                <SaidasOperacionais />
              </PrivateRoute>
            }
          />
          <Route
            path="/fechamento/novo"
            element={
              <PrivateRoute>
                <FechamentoNovo />
              </PrivateRoute>
            }
          />
          <Route
            path="/fechamento-novo"
            element={
              <PrivateRoute>
                <FechamentoNovo />
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
