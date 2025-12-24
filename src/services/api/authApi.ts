import { apiClient } from './client';
import type { LoginRequest, User } from '@/types';

export const authApi = {
  async login(data: LoginRequest) {
    const response = await apiClient.post('/auth/login', data);
    return response.data;
  },
  async register(data: { username: string; password: string }) {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },
  async getCurrentUser(): Promise<User> {
    // Optionally implement if backend supports /auth/me
    throw new Error('Not implemented');
  },
  async logout() {
    // Just clear local storage on frontend
    return Promise.resolve();
  },
};
