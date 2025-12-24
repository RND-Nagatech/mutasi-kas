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

app.use('/auth', authRoutes);
app.use('/transaksi', transaksiRoutes);
app.use('/master', masterRoutes);

app.use(errorHandler);

export default app;
