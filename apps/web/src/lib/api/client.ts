/**
 * Axios instance gọi thẳng `apps/api` — Ultron là công cụ 1 người dùng, chưa
 * có auth/session/tenant nào ở backend nên client này chỉ là transport thuần.
 */
import axios from 'axios';
import { ENV } from '@/constants/env';

export const apiClient = axios.create({
  baseURL: ENV.apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
});
