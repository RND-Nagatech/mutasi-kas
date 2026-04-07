# Postman Simulation - OpenAPI Mutasi Kas

## Files
- `Mutasi-Kas-OpenAPI.postman_collection.json`
- `Mutasi-Kas-OpenAPI.postman_environment.json`

## Quick Start
1. Import collection + environment ke Postman.
2. Pilih environment `Mutasi Kas OpenAPI Local`.
3. Sesuaikan variabel:
- `baseUrl` (default: `http://localhost:4444/api`)
- `adminUsername`, `adminPassword`
- `rekeningSumber` (rekening sumber valid dari master rekening)

## Recommended Run Order
1. `Get OpenAPI JSON` (opsional)
2. `Login Admin`
3. `Create API Token`
4. `Create Permintaan Transfer (External)`
5. `List Permintaan Transfer`
6. `Approve Permintaan Transfer`

## Auto Variables (set by scripts)
- `adminJwt` <- dari login admin
- `apiToken` <- dari create/regenerate token
- `apiTokenId` <- dari create token
- `permintaanTransferId` <- dari external create
- `externalInputBy` <- nama penginput dari sistem eksternal

## Notes
- Endpoint external create permintaan transfer otomatis membaca `kode_toko` dari API token.
- Payload external create wajib mengirim `input_by` (nama penginput dari sistem eksternal).
- Saat approve, backend akan membuat histori mutasi kas (`KIRIM`, `TRANSFER`) dan mengurangi saldo rekening sumber.
- Untuk melihat spesifikasi OpenAPI di browser:
  - `GET /api/openapi.json`
  - `GET /api/docs`
