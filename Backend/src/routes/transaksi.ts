import { Router } from 'express';
import * as mutasiKasController from '../controllers/mutasiKasController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/mutasi', authMiddleware, mutasiKasController.createMutasi);
router.get('/mutasi', authMiddleware, mutasiKasController.getMutasi);
router.post('/mutasi/:id/batal', authMiddleware, mutasiKasController.cancelMutasi);

export default router;
