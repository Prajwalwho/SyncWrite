# Real-Time Collaborative Rich Text Editor

A full-stack playground for building a collaborative text editor that keeps multiple clients in sync in near real-time. The project uses a React/Vite frontend backed by an Express + Socket.IO API with MongoDB persistence. Operational Transform (OT) logic on both the client and server keeps edits consistent even when several users type at the same time.

## Features

- **Live collaboration** – users connected to the same document see one another's changes instantly via Socket.IO.
- **Operational Transform pipeline** – OT helpers reconcile concurrent edits and maintain character order across clients.
- **Document management** – list, create, load, and update documents stored in MongoDB.
- **REST + WebSocket API** – standard CRUD endpoints for bootstrapping data plus a socket channel for streaming edits.
- **Configurable environments** – `.env` files for client (`VITE_API_URL`) and server (`MONGO_URI`, `PORT`).

## Tech Stack

| Layer     | Tools |
|-----------|-------|
| Frontend  | React 19, Vite, Socket.IO client |
| Backend   | Node.js, Express, Socket.IO, Mongoose |
| Database  | MongoDB / MongoDB Atlas |

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/soumya-1712/Real-Time-Collaborative-Text-Editor.git
cd Real-Time-Collaborative-Text-Editor
```

### 2. Configure environment variables

- **Server** (`server/.env`)
  ```env
  MONGO_URI=your_mongodb_connection_string
  PORT=3000
  ```

- **Client** (`Client/.env`)
  ```env
  VITE_API_URL=http://localhost:3000
  ```

*(Environment files are ignored by git; copy from the provided `.env.example` if available.)*

### 3. Install dependencies

```bash
# Server
cd server
npm install

# Client
cd ../Client
npm install
```

### 4. Run the stacks

In separate terminals:

```bash
# Backend
cd server
npm run dev        # or npm start for production mode

# Frontend
cd ../Client
npm run dev        # launches Vite dev server on http://localhost:5173
```

Open the client in your browser, create/select a document, and begin editing. Opening the same document in another window or browser demonstrates real-time collaboration.

## Project Layout

```
Client/                 React frontend (Vite)
  src/
    api/                REST + socket client helpers
    components/         Document list & editor UI
    hooks/              Custom OT state manager
    ot/                 Operational transform helpers
server/                 Express + Socket.IO backend
  src/
    controllers/        REST handlers
    sockets/            Real-time document channel
    ot/                 Server-side OT utilities
    utils/              Persistence helpers
.gitignore              Global ignore rules (client + server)
```

## Operational Transform Notes

- Clients queue local edits until the server acknowledges them with an updated revision.
- Incoming remote operations are transformed against any pending local operations to avoid character drift when typing quickly.
- The server persists the transformed operation, bumps the revision, and broadcasts it to all connected clients.

## Scripts

| Location | Command | Description |
|----------|---------|-------------|
| `Client` | `npm run dev` | Vite development server |
|          | `npm run build` | Production build |
|          | `npm run preview` | Preview built assets |
|          | `npm run lint` | ESLint checks |
| `server` | `npm run dev` | Nodemon development server |
|          | `npm start` | Production start |

## Contributing

1. Fork the repo and create a feature branch.
2. Commit changes with clear messages.
3. Ensure lint/tests pass.
4. Open a pull request describing the change and testing performed.


