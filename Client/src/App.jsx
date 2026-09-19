import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import DocumentList from './components/DocumentList';
import DocumentEditor from './components/DocumentEditor';

const ListPage = () => {
  const navigate = useNavigate();
  return <DocumentList onSelectDocument={(id) => navigate(`/document/${id}`)} />;
};

const EditorPage = () => {
  const { documentId } = useParams();
  const navigate = useNavigate();
  return <DocumentEditor documentId={documentId} onBack={() => navigate('/')} />;
};

const App = () => {
  return (
    <BrowserRouter>
      <div className="container">
        <Routes>
          <Route path="/" element={<ListPage />} />
          <Route path="/document/:documentId" element={<EditorPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

export default App;