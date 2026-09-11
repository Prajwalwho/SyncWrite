const BASE_URL = import.meta.env.VITE_API_URL;

const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Something went wrong');
  }
  return response.json();
};

export const getDocuments = async () => {
  const response = await fetch(`${BASE_URL}/documents`);
  return handleResponse(response);
};

export const createDocument = async (payload) => {
  const response = await fetch(`${BASE_URL}/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
};

export const getDocument = async (id) => {
  const response = await fetch(`${BASE_URL}/documents/${id}`);
  return handleResponse(response);
};

export const updateDocument = async (id, payload) => {
  const response = await fetch(`${BASE_URL}/documents/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title: payload.title }),
  });
  return handleResponse(response);
};

export const deleteDocument = async (id) => {
    const response = await fetch(`${BASE_URL}/documents/${id}`, {
        method: 'DELETE',
    });
    return handleResponse(response);
};
