import { Router } from 'express';
import * as authController from '../controllers/authController';
import * as apiTokenController from '../controllers/apiTokenController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);

router.post('/api-tokens', authMiddleware, apiTokenController.create);
router.get('/api-tokens', authMiddleware, apiTokenController.list);
router.get('/api-tokens/:id', authMiddleware, apiTokenController.detail);
router.put('/api-tokens/:id', authMiddleware, apiTokenController.update);
router.delete('/api-tokens/:id', authMiddleware, apiTokenController.remove);
router.post('/api-tokens/:id/regenerate', authMiddleware, apiTokenController.regenerate);

export default router;
