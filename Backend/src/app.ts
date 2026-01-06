import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import transaksiRoutes from './routes/transaksi';
import masterRoutes from './routes/master';

// Import models to ensure they are registered with Sequelize
import './models/User';
import './models/MutasiKas';
import './models/MutasiKasBatal';
import './models/Bank';
import './models/Rekening';

dotenv.config();

const app = express();

app.use(cors());
app.use(bodyParser.json());

// =======================
// Health Check
// =======================
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'backend-api',
    uptime: process.uptime(),          // detik
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/transaksi', transaksiRoutes);
app.use('/api/master', masterRoutes);

app.use(errorHandler);

export default app;
