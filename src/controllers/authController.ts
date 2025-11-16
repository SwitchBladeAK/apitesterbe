import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

const issueToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set in environment variables');
  }
  return jwt.sign({ sub: userId }, secret, { expiresIn: '7d' });
};

export const authController = {
  async register(req: Request, res: Response) {
    try {
      const { email, password, name } = req.body as { email: string; password: string; name?: string };
      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
      }
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Email already in use' });
      }
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await User.create({ email, passwordHash, name });
      const token = issueToken(user.id);
      return res.status(201).json({
        success: true,
        data: { token, user: { id: user.id, email: user.email, name: user.name } }
      });
    } catch (error) {
      console.error('Register error:', error);
      return res.status(500).json({ success: false, message: 'Failed to register' });
    }
  },

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body as { email: string; password: string };
      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
      }
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
      const token = issueToken(user.id);
      return res.status(200).json({
        success: true,
        data: { token, user: { id: user.id, email: user.email, name: user.name } }
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ success: false, message: 'Failed to login' });
    }
  }
};


