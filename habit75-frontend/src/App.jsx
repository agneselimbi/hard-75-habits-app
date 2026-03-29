import { ThemeProvider } from "./contexts/ThemeContext";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";

import { Checkin } from "./pages/checkin.jsx";
import { Dashboard } from "./pages/dashboard.jsx";
import { History } from "./pages/history.jsx";
import { Login } from "./pages/login.jsx";
import { Progress } from "./pages/progress.jsx";
import { Register } from "./pages/register.jsx";

import "./App.css";
import AuthProvider from "./contexts/authContext.jsx";
import { UseAuth } from "./contexts/authContext.jsx";

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = UseAuth();
  if (loading) return null;
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checkin"
              element={
                <ProtectedRoute>
                  <Checkin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <History />
                </ProtectedRoute>
              }
            />
            <Route
              path="/progress"
              element={
                <ProtectedRoute>
                  <Progress />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
