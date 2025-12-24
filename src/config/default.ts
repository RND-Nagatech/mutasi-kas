export default {
  jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret',
  mongoUri: process.env.MONGO_URI || '',
};
