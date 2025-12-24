import { Router } from 'express';
// Controllers and middleware will be implemented later
const router = Router();

// POST /transaksi/mutasi
router.post('/mutasi', (req, res) => {
  // controller logic here
});

// GET /transaksi/mutasi
router.get('/mutasi', (req, res) => {
  // controller logic here
});

// POST /transaksi/mutasi/:id/batal
router.post('/mutasi/:id/batal', (req, res) => {
  // controller logic here
});

export default router;
