export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Mutasi Kas API',
    version: '1.0.0',
    description:
      'OpenAPI untuk integrasi Mutasi Kas. Endpoint external permintaan transfer memakai API Token yang memuat kode_toko.',
  },
  servers: [{ url: '/api' }],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      ApiTokenAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      MutasiTerimaKasExternal: {
        type: 'object',
        required: ['nominal_rp', 'metode'],
        properties: {
          tanggal: { type: 'string', format: 'date-time', example: '2026-04-06T10:00:00.000Z' },
          jam: { type: 'string', example: '10:00:00' },
          metode: { type: 'string', enum: ['CASH', 'TRANSFER'], example: 'TRANSFER' },
          no_rekening: { type: 'string', example: '1234567890' },
          nominal_rp: { type: 'number', example: 250000 },
          saldo_awal: { type: 'number', example: 5000000 },
          kode_bank: { type: 'string', example: 'BCA' },
          gramasi: { type: 'number', example: 0 },
          keterangan: { type: 'string', example: 'Terima kas dari OpenAPI' },
        },
      },
      PermintaanTransferCreateExternal: {
        type: 'object',
        required: ['tanggal', 'nominal_rp', 'input_by', 'no_rekening_tujuan', 'nama_bank_tujuan', 'atas_nama_penerima'],
        properties: {
          tanggal: { type: 'string', format: 'date-time', example: '2026-04-02T10:00:00.000Z' },
          nominal_rp: { type: 'number', example: 1500000 },
          input_by: { type: 'string', example: 'Operator Cabang TK001' },
          no_rekening_tujuan: { type: 'string', example: '1234567890' },
          nama_bank_tujuan: { type: 'string', example: 'BCA' },
          atas_nama_penerima: { type: 'string', example: 'PT Contoh Maju' },
        },
      },
      ApiTokenCreate: {
        type: 'object',
        required: ['nama', 'kode_toko'],
        properties: {
          nama: { type: 'string', example: 'Integrasi Website A' },
          kode_toko: { type: 'string', example: 'TK001' },
        },
      },
      ApiTokenUpdate: {
        type: 'object',
        properties: {
          nama: { type: 'string', example: 'Integrasi Website A v2' },
          is_active: { type: 'boolean', example: true },
        },
      },
      ApiTokenResponse: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          nama: { type: 'string' },
          kode_toko: { type: 'string' },
          token_version: { type: 'number' },
          is_active: { type: 'boolean' },
          last_used_at: { type: 'string', nullable: true },
          created_by: { type: 'string' },
          created_at: { type: 'string' },
          updated_at: { type: 'string' },
        },
      },
    },
  },
  paths: {
    '/transaksi/openapi/mutasi/validasi': {
      get: {
        tags: ['External Transaksi Kas'],
        summary: 'List mutasi KIRIM status OPEN untuk validasi (berdasarkan kode toko di API token)',
        security: [{ ApiTokenAuth: [] }],
        parameters: [
          { name: 'startDate', in: 'query', required: false, schema: { type: 'string', format: 'date-time' } },
          { name: 'endDate', in: 'query', required: false, schema: { type: 'string', format: 'date-time' } },
          { name: 'metode', in: 'query', required: false, schema: { type: 'string', enum: ['CASH', 'TRANSFER', 'ALL'] } },
        ],
        responses: {
          '200': { description: 'Daftar mutasi untuk validasi' },
          '401': { description: 'Invalid API token' },
        },
      },
    },
    '/transaksi/openapi/mutasi/{id}/validasi': {
      post: {
        tags: ['External Transaksi Kas'],
        summary: 'Validasi mutasi OPEN menjadi DONE',
        security: [{ ApiTokenAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Mutasi tervalidasi' },
          '401': { description: 'Invalid API token' },
          '403': { description: 'Mutasi bukan milik kode toko token' },
          '400': { description: 'Mutasi bukan status OPEN' },
        },
      },
    },
    '/transaksi/openapi/mutasi/{id}/batal': {
      post: {
        tags: ['External Transaksi Kas'],
        summary: 'Batalkan mutasi OPEN menjadi CANCEL',
        security: [{ ApiTokenAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  alasan: { type: 'string', example: 'Pembatalan dari sistem eksternal' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Mutasi dibatalkan' },
          '401': { description: 'Invalid API token' },
          '403': { description: 'Mutasi bukan milik kode toko token' },
          '400': { description: 'Mutasi bukan status OPEN' },
        },
      },
    },
    '/transaksi/openapi/mutasi/terima-kas': {
      post: {
        tags: ['External Transaksi Kas'],
        summary: 'Buat mutasi TERIMA (status OPEN) berdasarkan kode toko di API token',
        security: [{ ApiTokenAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MutasiTerimaKasExternal' },
            },
          },
        },
        responses: {
          '201': { description: 'Mutasi TERIMA created' },
          '401': { description: 'Invalid API token' },
          '400': { description: 'Validation error' },
        },
      },
    },
    '/transaksi/permintaan-transfer/external': {
      post: {
        tags: ['External Permintaan Transfer'],
        summary: 'Create permintaan transfer dari aplikasi eksternal',
        security: [{ ApiTokenAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PermintaanTransferCreateExternal' },
            },
          },
        },
        responses: {
          '201': { description: 'Permintaan transfer created' },
          '401': { description: 'Invalid API token' },
          '400': { description: 'Validation error' },
        },
      },
    },
    '/auth/api-tokens': {
      get: {
        tags: ['API Tokens'],
        summary: 'List API token',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'List API token' } },
      },
      post: {
        tags: ['API Tokens'],
        summary: 'Create API token',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiTokenCreate' },
            },
          },
        },
        responses: {
          '201': { description: 'API token created (returns plain token once)' },
        },
      },
    },
    '/auth/api-tokens/{id}': {
      get: {
        tags: ['API Tokens'],
        summary: 'Get API token detail',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'API token detail' } },
      },
      put: {
        tags: ['API Tokens'],
        summary: 'Update API token',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiTokenUpdate' },
            },
          },
        },
        responses: { '200': { description: 'API token updated' } },
      },
      delete: {
        tags: ['API Tokens'],
        summary: 'Delete API token',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'API token deleted' } },
      },
    },
    '/auth/api-tokens/{id}/regenerate': {
      post: {
        tags: ['API Tokens'],
        summary: 'Regenerate API token (invalidate old token)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'New API token generated' } },
      },
    },
  },
};
