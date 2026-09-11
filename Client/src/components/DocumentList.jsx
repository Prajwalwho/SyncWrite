import React, { useState, useEffect } from 'react';
import { getDocuments, createDocument, deleteDocument } from '../api/documentService';

const DocumentList = ({ onSelectDocument }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = () => {
    setLoading(true);
    getDocuments()
      .then(docs => {
        setDocuments(docs);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  const handleNewDocument = () => {
    createDocument({ title: 'Untitled document' })
      .then(newDoc => {
        fetchDocuments();
        onSelectDocument(newDoc._id);
      })
      .catch(err => {
        setError(err.message);
      });
  };

  const handleDelete = (id) => {
    deleteDocument(id)
      .then(() => {
        fetchDocuments();
      })
      .catch(err => {
        setError(err.message);
      });
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="document-list">
      <button className="btn" onClick={handleNewDocument}>New Document</button>
      <div>
        {documents.map(doc => (
          <div key={doc._id} className="doc-row">
            <div className="doc-meta" onClick={() => onSelectDocument(doc._id)}>
              <span>{doc.title}</span>
              <small>Updated: {new Date(doc.updatedAt).toLocaleString()}</small>
            </div>
            <button className="doc-delete" onClick={() => handleDelete(doc._id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DocumentList;