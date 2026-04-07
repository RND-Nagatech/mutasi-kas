import { Router } from 'express';
import * as mutasiKasController from '../controllers/mutasiKasController';
import * as permintaanTransferController from '../controllers/permintaanTransferController';
import { authMiddleware } from '../middleware/auth';
import { apiTokenAuthMiddleware } from '../middleware/apiTokenAuth';

const router = Router();

router.post('/mutasi', authMiddleware, mutasiKasController.createMutasi);
router.get('/mutasi/last-saldo-akhir', authMiddleware, mutasiKasController.getLastSaldoAkhir);
router.get('/mutasi', authMiddleware, mutasiKasController.getMutasi);
router.post('/mutasi/:id/batal', authMiddleware, mutasiKasController.cancelMutasi);
router.post('/mutasi/:id/validasi', authMiddleware, mutasiKasController.validateMutasi);
router.get('/openapi/mutasi/validasi', apiTokenAuthMiddleware, mutasiKasController.getMutasiValidasiByApiToken);
router.post('/openapi/mutasi/:id/validasi', apiTokenAuthMiddleware, mutasiKasController.validateMutasiByApiToken);
router.post('/openapi/mutasi/:id/batal', apiTokenAuthMiddleware, mutasiKasController.cancelMutasiByApiToken);
router.post('/openapi/mutasi/terima-kas', apiTokenAuthMiddleware, mutasiKasController.createTerimaKasByApiToken);
router.post('/permintaan-transfer', authMiddleware, permintaanTransferController.create);
router.get('/permintaan-transfer', authMiddleware, permintaanTransferController.list);
router.get('/permintaan-transfer/:id', authMiddleware, permintaanTransferController.detail);
router.put('/permintaan-transfer/:id', authMiddleware, permintaanTransferController.update);
router.delete('/permintaan-transfer/:id', authMiddleware, permintaanTransferController.remove);
router.patch('/permintaan-transfer/:id/status', authMiddleware, permintaanTransferController.changeStatus);
router.post(
  '/permintaan-transfer/external',
  apiTokenAuthMiddleware,
  permintaanTransferController.createFromApiToken
);

export default router;
