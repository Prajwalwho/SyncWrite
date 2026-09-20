import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import documentRoutes from './routes/documentRoutes.js';
import authRoutes from './routes/authRoutes.js'; // NEW

dotenv.config();

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || '*' , credentials: true }));
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).send('ok');
});

app.use('/auth', authRoutes); // NEW
app.use('/documents', documentRoutes);

export default app;