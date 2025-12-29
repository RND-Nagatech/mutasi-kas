# Mutasi Kas — Frontend

This repository contains the frontend application for the Mutasi Kas system (Vite + React + TypeScript). The app provides UI for creating, receiving, cancelling, and reporting cash transfers between stores and the central cashier.

## Tech stack

- Vite
- React
- TypeScript
- Tailwind CSS
- shadcn-ui (Radix + Tailwind primitives)
- react-query

## Quick start (local development)

1. Install dependencies:

```bash
npm install
```

2. Environment variables (optional):

Create a `.env` file in the project root if you need to override defaults. Typical variable:

- `VITE_API_BASE` — base URL for the backend API (if the backend runs on a different host/port). If unset, the frontend calls the same origin.

3. Start dev server:

```bash
npm run dev
```

4. Build for production and preview:

```bash
npm run build
npm run preview
```

## NPM scripts

- `dev`: start Vite dev server
- `build`: build production assets
- `preview`: preview built assets locally

## Important pages / features

- `Login` — user authentication
- `Dashboard` — today's totals (Saldo, Total Kirim, Total Terima, number of transactions)
- `Kirim Kas` — create KIRIM transactions (CASH/TRANSFER)
- `Terima Kas` — accept KIRIM from other stores; creates TERIMA entries with correct saldo
- `Batal Kirim Kas` — cancel open KIRIM transactions; requires a reason and reverts balances
- `Laporan Mutasi Kas` — report page with `DETAIL` and `REKAP` modes; supports PDF/Excel exports
- `Laporan Kiriman & Setoran` — report + export for kiriman/setoran
- `Input Saldo` — record saldo adjustments for Cash / Rekening

UI notes:
- Tables are fetched only after user triggers search ("Tampilkan Laporan") to avoid unnecessary loads.
- PDF export uses `jsPDF` + `jspdf-autotable`; Excel export uses `xlsx` + `file-saver`.
- REKAP export omits the `Tipe` column and aggregates `totalTerima`/`totalKirim` correctly.

## Frontend ↔ Backend (API) overview

The frontend uses `src/services/api/*` to call the backend. Key endpoints the frontend relies on:

- `POST /auth/login` — authenticate and receive JWT
- `GET /master/toko` — master toko list for selects
- `GET /master/dashboard/summary` — dashboard metrics
- `GET /transaksi/mutasi` — list mutasi (supports query params: `type`, `startDate`, `endDate`, `kodeToko`, `metode`, `includeCanceled`)
- `GET /transaksi/mutasi/last-saldo-akhir` — last saldo_akhir for a `kodeToko` / `metode` / `noRekening`
- `POST /transaksi/mutasi` — create mutasi (KIRIM or TERIMA). Provide `saldo_awal` and `saldo_akhir` when creating TERIMA if available.
- `POST /transaksi/mutasi/:id/batal` — cancel mutasi (pass `{ alasan }` in body)

All protected calls require `Authorization: Bearer <token>`.

## Behavior details / implementation notes

- When cancelling a KIRIM, the backend marks the record `status_validasi = 'CANCEL'`, creates a cancellation record and reverts balances (updates `SaldoCash` and `tm_kas` if applicable).
- Dashboard and report summaries exclude cancelled transactions by default.
- `Terima Kas` flow: accepting a KIRIM creates a new `TERIMA` mutasi. The frontend fetches the last saldo via `/transaksi/mutasi/last-saldo-akhir` and sets `saldo_awal` and `saldo_akhir = saldo_awal + nominal` on the created TERIMA.

## Developer tips

- Update both `src/services/api/*` and backend controller mappings if you change API response shapes.
- Use React Query devtools while developing to inspect cache and invalidations.

## Manual verification / testing

1. Start backend and frontend (ensure `VITE_API_BASE` is set if backend hosted separately).
2. Create a KIRIM via `Kirim Kas` and verify it appears in `Laporan Mutasi Kas` (DETAIL view).
3. Cancel the KIRIM via `Batal Kirim Kas` with a reason and verify it is excluded from dashboard/report totals and a record exists in `tt_mutasi_kas_batal`.
4. Accept a KIRIM via `Terima Kas` and verify the created TERIMA has `saldo_awal` equal to last saldo and `saldo_akhir = saldo_awal + nominal`.

## Extras I can add

- a `frontend/.env.example` file with recommended environment vars
- a Postman collection or curl examples for the main flows
- a small script to run frontend + backend together for dev

Tell me which of the above you'd like and I will add it.
