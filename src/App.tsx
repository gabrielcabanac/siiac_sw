import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { RegistroOperacional } from './pages/RegistroOperacional';
import { PanelETL } from './pages/PanelETL';
import { ImportarExcel } from './pages/ImportarExcel';
import { ConsultaCiudadana } from './pages/ConsultaCiudadana';
import { HistorialLotes } from './pages/HistorialLotes';

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isMockMode } = useAuth();

  if (!isMockMode && !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <div className="flex-1 flex">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route
            path="/dashboard"
            element={
              <MainLayout>
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              </MainLayout>
            }
          />

          <Route
            path="/operaciones"
            element={
              <MainLayout>
                <ProtectedRoute allowedRoles={['admin', 'operador']}>
                  <RegistroOperacional />
                </ProtectedRoute>
              </MainLayout>
            }
          />

          <Route
            path="/etl"
            element={
              <MainLayout>
                <ProtectedRoute allowedRoles={['admin', 'operador']}>
                  <PanelETL />
                </ProtectedRoute>
              </MainLayout>
            }
          />

          <Route
            path="/importar"
            element={
              <MainLayout>
                <ProtectedRoute allowedRoles={['admin', 'operador']}>
                  <ImportarExcel />
                </ProtectedRoute>
              </MainLayout>
            }
          />

          <Route
            path="/consulta"
            element={
              <MainLayout>
                <ProtectedRoute>
                  <ConsultaCiudadana />
                </ProtectedRoute>
              </MainLayout>
            }
          />

          <Route
            path="/historial"
            element={
              <MainLayout>
                <ProtectedRoute>
                  <HistorialLotes />
                </ProtectedRoute>
              </MainLayout>
            }
          />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
