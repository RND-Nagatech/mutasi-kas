import { apiClient } from './client';
import type { DashboardSummary } from '@/types';

export const dashboardApi = {
  async getSummary(): Promise<DashboardSummary> {
    const response = await apiClient.get('/master/dashboard/summary');
    return response.data;
  },
};
