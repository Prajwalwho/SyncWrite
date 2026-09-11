# Backend Server

This is the backend server for the real-time collaborative text editor.

## Environment Variables

Create a `.env` file in the `server` directory with the following variables:

```
MONGO_URI=<your_mongodb_connection_string>
PORT=3000
FRONTEND_URL=http://localhost:5173
```

## Available Scripts

In the `server` directory, you can run:

### `npm install`

Installs the required dependencies.

### `npm start`

Runs the app in production mode.

### `npm run dev`

Runs the app in development mode with nodemon.

## API Endpoints

*   `GET /health`: Health check endpoint.
*   `GET /documents`: Get all documents.
*   `POST /documents`: Create a new document.
*   `GET /documents/:id`: Get a document by ID.
*   `PUT /documents/:id`: Update a document.

## Socket Events

*   `connection`: A user connects to the server.
*   `join-document`: A user joins a document room.
    *   Payload: `{ documentId: string }`
*   `document-state`: The server sends the current document state to the user.
    *   Payload: `{ title: string, content: string, updatedAt: Date }`
*   `user-joined`: A user joins a document room.
    *   Payload: `{ socketId: string }`
*   `document-update`: A user updates a document.
    *   Payload: `{ documentId: string, title: string, content: string }`
*   `leave-document`: A user leaves a document room.
    *   Payload: `{ documentId: string }`
*   `user-left`: A user leaves a document room.
    *   Payload: `{ socketId: string }`
*   `disconnect`: A user disconnects from the server.
