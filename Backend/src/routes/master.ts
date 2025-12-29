

import { Router, Request, Response } from 'express';
const expressValidator = require('express-validator');
import Bank from '../models/Bank';
import Rekening from '../models/Rekening';
import { authMiddleware } from '../middleware/auth';
import { inputSaldoRekening, getSaldoRekening, updateSaldoRekening } from '../controllers/saldoRekeningController';
import { getAllToko } from '../controllers/masterTokoController';
import { inputSaldoCash, getSaldoCash } from '../controllers/saldoCashController';
import { getDashboardSummary } from '../controllers/dashboardController';


const router = Router();
// Dashboard summary route
router.get('/dashboard/summary', getDashboardSummary);
// Dashboard summary route
router.get('/dashboard/summary', getDashboardSummary);

// Saldo Cash Routes (protected)
router.post('/saldo-cash', authMiddleware, inputSaldoCash);
router.get('/saldo-cash', authMiddleware, getSaldoCash);

// Saldo Rekening Routes (protected)
router.get('/saldo-rekening', authMiddleware, async (req: Request, res: Response) => {
  try {
    // Ambil semua saldo rekening, urut terbaru di atas
    const saldo = await require('../models/SaldoRekening').default.find().sort({ tanggal: -1 });
    res.json({ success: true, data: saldo });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal ambil saldo rekening', error: err });
  }
});

// Master Toko Route
router.get('/toko', getAllToko);

// Apply authentication to all routes
router.use(authMiddleware);

// Bank Routes
router.get('/bank', async (req: Request, res: Response) => {
  try {
    const banks = await Bank.find().sort({ created_at: -1 });
    res.json({
      success: true,
      data: banks,
    });
  } catch (error) {
    console.error('Error fetching banks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch banks',
    });
  }
});

router.post(
  '/bank',
  [
    expressValidator.body('kode_bank').notEmpty().withMessage('Kode bank wajib diisi'),
    expressValidator.body('nama_bank').notEmpty().withMessage('Nama bank wajib diisi'),
    expressValidator.body('nomor_akun').notEmpty().withMessage('Nomor akun wajib diisi'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = expressValidator.validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }


      // Ambil data dari body
      const { kode_bank, nama_bank, nomor_akun } = req.body;
      // Ambil user login dari req.user (hasil authMiddleware)
      const user = (req as any).user;
      const input_by = user?.username || user?.name || 'unknown';

      const bank = await Bank.create({
        kode_bank,
        nama_bank,
        nomor_akun,
        input_by,
      });

      res.status(201).json({
        success: true,
        data: bank,
        message: 'Bank berhasil ditambahkan',
      });
    } catch (error) {
      console.error('Error creating bank:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create bank',
      });
    }
  }
);

router.put(
  '/bank/:id',
  [
    expressValidator.param('id').isMongoId().withMessage('Invalid bank ID'),
    expressValidator.body('kode_bank').optional().notEmpty().withMessage('Kode bank tidak boleh kosong'),
    expressValidator.body('nama_bank').optional().notEmpty().withMessage('Nama bank tidak boleh kosong'),
    expressValidator.body('nomor_akun').optional().notEmpty().withMessage('Nomor akun tidak boleh kosong'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = expressValidator.validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { id } = req.params;
      const { kode_bank, nama_bank, nomor_akun } = req.body;

      const bank = await Bank.findById(id);
      if (!bank) {
        return res.status(404).json({
          success: false,
          message: 'Bank tidak ditemukan',
        });
      }

      bank.kode_bank = kode_bank || bank.kode_bank;
      bank.nama_bank = nama_bank || bank.nama_bank;
      bank.nomor_akun = nomor_akun || bank.nomor_akun;
      // Ambil user login dari req.user
      const user = (req as any).user;
      bank.edited_by = user?.username || user?.name || 'unknown';
      await bank.save();

      res.json({
        success: true,
        data: bank,
        message: 'Bank berhasil diperbarui',
      });
    } catch (error) {
      console.error('Error updating bank:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update bank',
      });
    }
  }
);

router.delete('/bank/:id', [expressValidator.param('id').isMongoId().withMessage('Invalid bank ID')], async (req: Request, res: Response) => {
  try {
    const errors = expressValidator.validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { id } = req.params;

    const bank = await Bank.findById(id);
    if (!bank) {
      return res.status(404).json({
        success: false,
        message: 'Bank tidak ditemukan',
      });
    }

    // Ambil user login dari req.user
    const user = (req as any).user;
    if (bank) {
      bank.deleted_by = user?.username || user?.name || 'unknown';
      await bank.save();
    }
    await Bank.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Bank berhasil dihapus',
    });
  } catch (error) {
    console.error('Error deleting bank:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete bank',
    });
  }
});

// Rekening Routes
// Saldo Rekening Routes
router.post('/saldo-rekening', authMiddleware, inputSaldoRekening);
router.get('/saldo-rekening/:no_rekening', authMiddleware, getSaldoRekening);
router.put('/saldo-rekening/:no_rekening', authMiddleware, updateSaldoRekening);
router.get('/rekening', async (req: Request, res: Response) => {
  try {
    const rekenings = await Rekening.find().sort({ created_at: -1 });
    res.json({
      success: true,
      data: rekenings,
    });
  } catch (error) {
    console.error('Error fetching rekenings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch rekenings',
    });
  }
});

router.post(
  '/rekening',
  [
    expressValidator.body('kode_bank').notEmpty().withMessage('Kode bank wajib diisi'),
    expressValidator.body('no_rekening').notEmpty().withMessage('Nomor rekening wajib diisi'),
    expressValidator.body('nama_rekening').notEmpty().withMessage('Nama rekening wajib diisi'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = expressValidator.validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { kode_bank, no_rekening, nama_rekening, input_by } = req.body;

      // Optionally: check if kode_bank exists in Bank
      const bank = await Bank.findOne({ kode_bank });
      if (!bank) {
        return res.status(400).json({
          success: false,
          message: 'Bank tidak ditemukan',
        });
      }


      // Ambil user login dari req.user (hasil authMiddleware)
      const user = (req as any).user;
      const input_by_user = user?.username || user?.name || 'unknown';

      const rekening = await Rekening.create({
        kode_bank,
        no_rekening,
        nama_rekening,
        input_by: input_by_user,
      });

      res.status(201).json({
        success: true,
        data: rekening,
        message: 'Rekening berhasil ditambahkan',
      });
    } catch (error) {
      console.error('Error creating rekening:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create rekening',
      });
    }
  }
);

router.put(
  '/rekening/:id',
  [
    expressValidator.param('id').isMongoId().withMessage('Invalid rekening ID'),
    expressValidator.body('kode_bank').optional().notEmpty().withMessage('Kode bank tidak boleh kosong'),
    expressValidator.body('no_rekening').optional().notEmpty().withMessage('Nomor rekening tidak boleh kosong'),
    expressValidator.body('nama_rekening').optional().notEmpty().withMessage('Nama rekening tidak boleh kosong'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = expressValidator.validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { id } = req.params;
      const { kode_bank, no_rekening, nama_rekening, input_by } = req.body;

      const rekening = await Rekening.findById(id);
      if (!rekening) {
        return res.status(404).json({
          success: false,
          message: 'Rekening tidak ditemukan',
        });
      }

      // Optionally: check if kode_bank exists in Bank
      if (kode_bank) {
        const bank = await Bank.findOne({ kode_bank });
        if (!bank) {
          return res.status(400).json({
            success: false,
            message: 'Bank tidak ditemukan',
          });
        }
      }

      rekening.kode_bank = kode_bank || rekening.kode_bank;
      rekening.no_rekening = no_rekening || rekening.no_rekening;
      rekening.nama_rekening = nama_rekening || rekening.nama_rekening;
      rekening.input_by = input_by || rekening.input_by;
      // set edited_by to current user when updating
      const user = (req as any).user;
      rekening.edited_by = user?.username || user?.name || 'unknown';
      await rekening.save();

      res.json({
        success: true,
        data: rekening,
        message: 'Rekening berhasil diperbarui',
      });
    } catch (error) {
      console.error('Error updating rekening:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update rekening',
      });
    }
  }
);

router.delete('/rekening/:id', [expressValidator.param('id').isMongoId().withMessage('Invalid rekening ID')], async (req: Request, res: Response) => {
  try {
    const errors = expressValidator.validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const user = (req as any).user;
    const deleted_by_user = user?.username || user?.name || 'unknown';

    const rekening = await Rekening.findById(id);
    if (!rekening) {
      return res.status(404).json({
        success: false,
        message: 'Rekening tidak ditemukan',
      });
    }

    rekening.deleted_by = deleted_by_user;
    await rekening.save();
    await Rekening.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Rekening berhasil dihapus',
    });
  } catch (error) {
    console.error('Error deleting rekening:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete rekening',
    });
  }
});

export default router;