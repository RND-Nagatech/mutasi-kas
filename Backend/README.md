# Kas Hub Backend

Updated documentation for the current backend implementation used by the Mutasi Kas frontend.

## Tech Stack
- Node.js
- Express
- TypeScript
- MongoDB (Mongoose)

## Project Structure (important folders)
```
src/
├── controllers/       # Express controllers (thin)
├── routes/            # Route registration
├── models/            # Mongoose models
├── services/          # Business logic and DB operations
├── middleware/        # Auth, error handling
├── utils/             # Helpers
├── config/            # Config (db, jwt)
├── app.ts
└── server.ts
```

## Setup
1. Install dependencies:
```bash
npm install
```
2. Copy `.env.example` to `.env` and set required variables (examples below).
3. Run in development:
```bash
npm run dev
```
4. Build for production and run:
```bash
npm run build
npm start
```

## Environment variables (typical)
- `MONGODB_URI` — MongoDB connection string
- `JWT_SECRET` — secret for signing JWT tokens
- `PORT` — optional server port

## Important Endpoints
All transactional endpoints require authentication (JWT in `Authorization: Bearer <token>`).

### Auth
- `POST /auth/register` — Register user
- `POST /auth/login` — Login user (returns JWT)

### Master / Lookup
- `GET /master/toko` — Get master toko list (used by frontend selects)
- `GET /master/dashboard/summary` — Dashboard summary (aggregated totals)

### Saldo
- `POST /master/saldo-cash` — Input saldo cash (protected)
- `GET /master/saldo-cash` — Get saldo cash history (protected)
- `GET /master/saldo-rekening` — Get saldo rekening (protected)

### Mutasi (Transaksi)
- `POST /transaksi/mutasi` — Create mutasi kas (protected). When creating, pass fields like `kode_toko`, `metode`, `no_rekening`, `nominal_rp`, `saldo_awal`, `saldo_akhir`, `tanggal`, `jam`, `jenisKas`/`jenis_kas` (KIRIM/TERIMA).
- `GET /transaksi/mutasi` — List mutasi. Supports query params: `type=DETAIL|REKAP`, `startDate`, `endDate`, `kodeToko`, `metode`, `jenisTransaksi`, `includeCanceled`.
  - By default cancelled transactions are excluded; include `includeCanceled=true` to include them.
- `GET /transaksi/mutasi/last-saldo-akhir` — Return last `saldo_akhir` for a given `kodeToko` + `metode` (+ optional `noRekening`). Used to compute saldo_awal for TERIMA flows.
- `POST /transaksi/mutasi/:id/batal` — Cancel mutasi (protected). Body may include `alasan` (reason). Cancellation will mark `status_validasi = 'CANCEL'`, write a record to the cancellation table, and revert related balances (SaldoCash or TmKas).

## Implementation notes
- Business logic lives under `src/services` (e.g., `mutasiKasService`, `dashboardService`) and models under `src/models` (e.g., `MutasiKas`, `TmKas`, `SaldoCash`, `MutasiKasBatal`).
- Cancel flow: when a KIRIM is cancelled, the service updates historic saldo (creates compensating `SaldoCash` entry) and adjusts `tm_kas` if present, then records the cancellation in `tt_mutasi_kas_batal` (with `alasan`).
- Dashboard summary: aggregated totals are computed by `dashboardService.getDashboardSummary()` and exclude cancelled transactions.
- Rekap report: an aggregation helper `getMutasiKasRekap` groups mutasi by date and computes `saldoAwal`, `totalTerima`, `totalKirim`, and `saldoAkhir` per date.

## Development & Testing
- Run the backend in dev mode (`npm run dev`) and verify endpoints with Postman or the frontend.
- Make sure `.env` contains the correct `MONGODB_URI` and `JWT_SECRET` and that MongoDB is accessible.

## Contributing
- Follow existing patterns: controllers are thin, services contain DB and business logic.
- Keep API backward-compatible when possible; use query params like `includeCanceled` to opt-in to different behavior.

If you want, I can also add a sample `.env.example` file or generate a Postman collection covering the key endpoints.
