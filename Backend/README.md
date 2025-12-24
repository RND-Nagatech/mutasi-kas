# Kas Hub Backend

## Tech Stack
- Node.js
- Express
- TypeScript
- MongoDB (Mongoose)

## Project Structure
```
src/
├── controllers/
├── routes/
├── models/
├── middleware/
├── utils/
├── config/
├── app.ts
├── server.ts
```

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env` and set your MongoDB URI and JWT secret.
3. Run in development:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   npm start
   ```

## Endpoints
### Auth
- `POST /auth/register` — Register user
- `POST /auth/login` — Login user

### Mutasi Kas
- `POST /transaksi/mutasi` — Create mutasi kas (auth required)
- `GET /transaksi/mutasi` — List mutasi kas (auth required)
- `POST /transaksi/mutasi/:id/batal` — Cancel mutasi kas (auth required)

## Notes
- All transaction endpoints require JWT auth in `Authorization: Bearer <token>` header.
- Passwords are hashed with bcrypt.
- Business logic is in services, controllers are thin.
- Centralized error handler is used.
