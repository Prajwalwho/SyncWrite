import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import connectToDatabase from './config/db.js';
import registerDocumentSocket from './sockets/documentSocket.js';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectToDatabase();

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || '*' ,
      credentials: true,
    },
  });

  registerDocumentSocket(io);

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
