import { apiClient } from './client';
import type { ApiToken, CreateApiTokenRequest } from '@/types';

export const apiTokenApi = {
  async list(): Promise<ApiToken[]> {
    const response = await apiClient.get('/auth/api-tokens');
    return Array.isArray(response.data) ? response.data : [];
  },

  async create(payload: CreateApiTokenRequest): Promise<ApiToken & { token: string }> {
    const response = await apiClient.post('/auth/api-tokens', payload);
    return response.data;
  },

  async update(id: string, payload: { nama?: string; is_active?: boolean }): Promise<ApiToken> {
    const response = await apiClient.put(`/auth/api-tokens/${id}`, payload);
    return response.data;
  },

  async regenerate(id: string): Promise<ApiToken & { token: string }> {
    const response = await apiClient.post(`/auth/api-tokens/${id}/regenerate`);
    return response.data;
  },

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/auth/api-tokens/${id}`);
    return response.data;
  },
};
