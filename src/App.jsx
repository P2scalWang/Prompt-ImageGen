import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './components/Shared/AlertToast';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import LoginPage from './components/Auth/LoginPage';
import AppLayout from './components/Layout/AppLayout';
import GeneratorPage from './pages/user/GeneratorPage';
import UserHistory from './pages/user/UserHistory';
import UserSettings from './pages/user/UserSettings';
import AdminDashboard from './pages/admin/AdminDashboard';
import PromptManager from './pages/admin/PromptManager';
import UserManager from './pages/admin/UserManager';
import UsageMonitor from './pages/admin/UsageMonitor';

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        {/* User Routes */}
        <Route path="/" element={<GeneratorPage />} />
        <Route path="/history" element={<UserHistory />} />
        <Route path="/settings" element={<UserSettings />} />

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/prompts"
          element={
            <ProtectedRoute requiredRole="admin">
              <PromptManager />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute requiredRole="admin">
              <UserManager />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/usage"
          element={
            <ProtectedRoute requiredRole="admin">
              <UsageMonitor />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
