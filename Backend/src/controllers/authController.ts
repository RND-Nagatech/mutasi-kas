import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/authService';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;
    const user = await authService.registerUser(username, password);
    // Only return safe user info (no password)
    res.status(201).json({ id: user.id, username: user.username });
  } catch (err) {
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;
    const result = await authService.loginUser(username, password);
    // Only return token, never echo credentials
    res.json({ token: result.token });
  } catch (err) {
    next(err);
  }
};
