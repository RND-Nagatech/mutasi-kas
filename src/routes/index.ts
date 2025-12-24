import { Router } from 'express';
import authRoutes from './auth';
import transaksiRoutes from './transaksi';

const router = Router();

router.use('/auth', authRoutes);
router.use('/transaksi', transaksiRoutes);

export default router;
