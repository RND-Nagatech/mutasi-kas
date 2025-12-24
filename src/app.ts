import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import routes from './routes';
import errorHandler from './middleware/errorHandler';

const app = express();

app.use(express.json());
app.use(cors());
app.use(morgan('dev'));
app.use(helmet());

app.use('/api', routes);

app.use(errorHandler);

export default app;
