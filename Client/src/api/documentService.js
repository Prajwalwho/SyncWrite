const BASE_URL = import.meta.env.VITE_API_URL;

const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Something went wrong');
  }
  return response.json();
};

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const getDocuments = async () => {
  const response = await fetch(`${BASE_URL}/documents`, {
    headers: authHeaders(),
  });
  return handleResponse(response);
};

export const createDocument = async (payload) => {
  const response = await fetch(`${BASE_URL}/documents`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
};

export const getDocument = async (id) => {
  const response = await fetch(`${BASE_URL}/documents/${id}`, {
    headers: authHeaders(),
  });
  return handleResponse(response);
};

export const updateDocument = async (id, payload) => {
  const response = await fetch(`${BASE_URL}/documents/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ title: payload.title }),
  });
  return handleResponse(response);
};

export const deleteDocument = async (id) => {
    const response = await fetch(`${BASE_URL}/documents/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
    });
    return handleResponse(response);
};

export const shareDocument = async (id, payload) => {
  const response = await fetch(`${BASE_URL}/documents/${id}/share`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
};

export const removeCollaborator = async (id, collaboratorId) => {
  const response = await fetch(`${BASE_URL}/documents/${id}/collaborators/remove`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ collaboratorId }),
  });
  return handleResponse(response);
};