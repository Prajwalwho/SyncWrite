import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams, Navigate } from 'react-router-dom';
import DocumentList from './components/DocumentList';
import DocumentEditor from './components/DocumentEditor';
import Login from './components/Login';
import { AuthProvider, useAuth } from './context/AuthContext';

const ListPage = () => {
  const navigate = useNavigate();
  return <DocumentList onSelectDocument={(id) => navigate(`/document/${id}`)} />;
};

const EditorPage = () => {
  const { documentId } = useParams();
  const navigate = useNavigate();
  return <DocumentEditor documentId={documentId} onBack={() => navigate('/')} />;
};

// NEW: blocks access to a route unless the user is logged in
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><ListPage /></ProtectedRoute>} />
      <Route path="/document/:documentId" element={<ProtectedRoute><EditorPage /></ProtectedRoute>} />
    </Routes>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="container">
          <AppRoutes />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;