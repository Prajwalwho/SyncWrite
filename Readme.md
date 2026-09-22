# SyncWrite

A real-time collaborative text editor built from the ground up with a custom Operational Transform (OT) engine, live cursor presence, JWT authentication, and document sharing — inspired by tools like Google Docs.

**Live app:** https://sync-write-omega.vercel.app
**Backend API:** https://syncwrite-1s5a.onrender.com

> Note: the backend runs on Render's free tier, which spins down after periods of inactivity. The first request after idle time may take 30–50 seconds to respond while the server wakes up.

---

## What it does

SyncWrite lets multiple people edit the same document at the same time and see each other's changes appear instantly — including exactly where each collaborator's cursor is. It's a full-stack implementation of the core problem behind tools like Google Docs: keeping many people's edits consistent when they happen concurrently, out of order, or across dropped connections.

### Core features

- **Real-time collaborative editing** — edits sync across all connected clients in well under a second
- **Operational Transform (OT) engine** — a custom-built transform algorithm (insert/delete reconciliation, tie-breaking, convergence guarantees) written and unit-tested from scratch, not a third-party library
- **Live cursor & presence indicators** — see who else is viewing a document and exactly where their cursor is, with positions that correctly shift as concurrent edits happen around them
- **Authentication** — JWT-based signup/login with bcrypt password hashing
- **Document ownership & sharing** — each document has an owner; owners can add collaborators by email or toggle a public "anyone with the link can edit" mode
- **Reconnection handling** — if a client's connection drops, it automatically rejoins on reconnect and resubmits any edits that hadn't been acknowledged yet
- **Access control enforced at every layer** — REST API, Socket.IO handshake, and the OT sync layer all independently verify a user is allowed to view or edit a given document

---

## Tech stack

| Layer | Tools |
|---|---|
| Frontend | React 19, Vite, React Router, Socket.IO client |
| Backend | Node.js, Express, Socket.IO, Mongoose |
| Database | MongoDB Atlas |
| Auth | JWT, bcrypt |
| Testing | Vitest |
| Deployment | Vercel (frontend), Render (backend) |

---

## Architecture

```
Client/                        React frontend (Vite)
  src/
    api/                       REST + auth + socket client helpers
    components/                DocumentList, DocumentEditor, ShareModal, Login
    context/                   AuthContext — app-wide auth state
    hooks/
      useOperationalDocument   Client-side OT state manager
      useCursors               Cursor broadcast + position shifting
      usePresence              Who's currently viewing the document
    ot/                        Client-side Operational Transform logic
    utils/
      caretCoordinates.js      Converts a character offset to pixel position
                                (mirror-div technique) for rendering cursor markers

server/
  src/
    controllers/                REST handlers (documents, sharing, auth)
    middleware/                 JWT auth middleware
    models/                     User, Document (with ownership, collaborators, opsLog)
    ot/                         Server-side Operational Transform logic
    sockets/                    Real-time document channel — join, edit, cursor, presence
    utils/                      Document persistence helpers
```

### How the OT sync pipeline works

1. A client makes a local edit; it's applied optimistically and queued as a "pending" operation
2. The operation is sent to the server along with the client's last-known revision number
3. The server transforms the incoming operation against every operation that happened concurrently (i.e., after the client's known revision), so it lands in the correct position regardless of what anyone else did in the meantime
4. The transformed operation is applied to the server's in-memory copy of the document, the revision number increments, and the operation is broadcast to every other connected client
5. Each client transforms the incoming operation against its own still-pending local edits before applying it, keeping every client's view of the document consistent
6. The server debounces writes to MongoDB (rather than persisting on every keystroke) for performance, while keeping the authoritative document state in memory between writes

Document edits, revision numbers, and an operation log are all persisted, so a fresh client joining an in-progress document receives the current state directly rather than replaying the full history.

### Cursor position tracking

Cursor positions are broadcast as raw character offsets. Since concurrent edits can insert or delete text before another user's cursor, every stored cursor position is shifted forward or backward in response to both incoming remote operations and the current user's own local edits — otherwise cursor markers would drift out of sync with the actual text within a few keystrokes.

---

## Known limitations

- **Reconnection resync is a simplification.** On reconnect, a client reapplies its pending (unacknowledged) local edits directly on top of the server's latest content, rather than transforming them through the full history of operations that happened while disconnected. This is correct for short disconnects but isn't a fully rigorous OT resync — a production system would transform each pending operation through every logged operation since the client's last known revision.
- **Render's free tier cold-starts.** The backend spins down after inactivity; the first request after idle can take up to ~50 seconds.
- **No email verification.** Signup is immediate with no confirmation step — acceptable for a portfolio/demo project, but a real public launch would want this.
- **JWTs are stored in `localStorage`**, not httpOnly cookies. This is simpler to implement but more vulnerable to XSS than the cookie + refresh-token pattern a production system would typically use.

---

## Running it locally

### Prerequisites
- Node.js (v18+)
- A MongoDB connection string (local MongoDB or a free MongoDB Atlas cluster)

### 1. Clone the repository
```bash
git clone https://github.com/Prajwalwho/SyncWrite.git
cd SyncWrite
```

### 2. Set up environment variables

**`server/.env`**
```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=a_long_random_string
PORT=3000
```

**`Client/.env`**
```env
VITE_API_URL=http://localhost:3000
```

### 3. Install dependencies
```bash
# Server
cd server
npm install

# Client
cd ../Client
npm install
```

### 4. Run it
In two separate terminals:
```bash
# Backend
cd server
npm run dev

# Frontend
cd Client
npm run dev
```

Open `http://localhost:5173`, sign up for an account, and start writing. Open the same document in a second browser tab (or an incognito window, logged in as a different account) to see real-time collaboration in action.

---

## Testing

The Operational Transform logic — the part of this project where correctness actually matters most — is covered by a unit test suite, including explicit convergence tests (verifying that two clients applying the same set of concurrent edits in different orders end up with identical documents).

```bash
cd server
npm test
```

---

## What I'd build next

- Full transform-through-history resync on reconnect, rather than the simplified version currently in place
- Rich text formatting (bold, italic, headings) rather than plain text
- Document version history / snapshots
- httpOnly cookie + refresh token auth instead of a long-lived JWT in localStorage
- Rate limiting on auth endpoints

---

## License

MIT
