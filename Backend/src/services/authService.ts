import User, { IUser } from '../models/User';
import { hashPassword, comparePassword } from '../utils/hash';
import { signJwt } from '../utils/jwt';

export const registerUser = async (username: string, password: string) => {
  const existing = await User.findOne({ username });
  if (existing) throw { status: 400, message: 'Username already exists' };
  const hashed = await hashPassword(password);
  const user = new User({ username, password: hashed });
  await user.save();
  return { id: user._id, username: user.username };
};

export const loginUser = async (username: string, password: string) => {
  const user = await User.findOne({ username });
  // Basic input validation to avoid passing undefined to bcrypt.compare
  if (!username || !password) throw { status: 400, message: 'Username and password required' };

  if (!user || !user.password) throw { status: 400, message: 'Invalid credentials' };

  const valid = await comparePassword(password, user.password);
  const token = signJwt({ id: user._id, username: user.username });
  return { token };
};
