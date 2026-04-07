import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import transaksiRoutes from './routes/transaksi';
import masterRoutes from './routes/master';
import { openApiDocument } from './docs/openapi';

// Import models to ensure they are registered with Sequelize
import './models/User';
import './models/MutasiKas';
import './models/MutasiKasBatal';
import './models/Bank';
import './models/Rekening';
import './models/PermintaanTransfer';
import './models/ApiToken';

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

app.get('/api/openapi.json', (req, res) => {
  res.json(openApiDocument);
});

app.get('/api/docs', (req, res) => {
  res.type('html').send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Mutasi Kas API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>body{margin:0;background:#fafafa}</style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({ url: '/api/openapi.json', dom_id: '#swagger-ui' });
    </script>
  </body>
</html>`);
});

app.use('/api/auth', authRoutes);
app.use('/api/transaksi', transaksiRoutes);
app.use('/api/master', masterRoutes);

app.use(errorHandler);

export default app;
