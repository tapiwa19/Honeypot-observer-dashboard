import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';
 
// configure axios global defaults so existing imports will use them
axios.defaults.baseURL = API_BASE_URL;
axios.defaults.withCredentials = true; // in case cookies are used later
 
// attach token automatically on every request
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
 
// optional: intercept responses to handle 401/refresh logic
axios.interceptors.response.use(
  r => r,
  err => {
    if (err.response && err.response.status === 401) {
      console.warn('API responded 401; clearing auth token');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // could trigger app-wide logout here if desired
    }
    return Promise.reject(err);
  }
);
 
export const api = {
  // Dashboard
  getDashboardStats: () => axios.get('/dashboard/stats'),
  getRecentAttacks: (params?: any) => axios.get('/dashboard/attacks', { params }),
 
  // Sessions
  getLiveSessions: (params?: any) => axios.get('/sessions/live', { params }),
  getSessionCommands: (sessionId: string) => axios.get(`/sessions/${sessionId}/commands`),
  getSessionDetails: (sessionId: string) => axios.get(`/sessions/${sessionId}/details`),
 
  // Analytics
  getAnalyticsTimeline: (params?: any) => axios.get('/analytics/timeline', { params }),
  getTopCountries: (params?: any) => axios.get('/analytics/countries', { params }),
  getBehavioralAnalytics: () => axios.get('/analytics/behavioral'),
  getAnalyticsStats: (params?: any) => axios.get('/analytics/stats', { params }),
  getAttackDistribution: (params?: any) => axios.get('/analytics/distribution', { params }),
 
  // Credentials
  getCredentials: () => axios.get('/credentials'),
  getCredentialsTable: (params?: any) => axios.get('/credentials/table', { params }),
 
  // System
  getSystemInfo: () => axios.get('/system/info'),
  restartServices: () => axios.post('/services/restart'),
 
  // Settings
  getSettings: () => axios.get('/settings'),
  updateSettings: (settings: any) => axios.post('/settings', settings),
 
  // Data
  clearAllData: () => axios.delete('/data/clear'),
 
  // Health
  getHealth: () => axios.get('/health'),
 
  // Notifications
  getNotificationConfig: () => axios.get('/notifications/config'),
  saveEmailConfig: (config: any) => axios.post('/notifications/config/email', config),
  saveTwilioConfig: (config: any) => axios.post('/notifications/config/twilio', config),
  saveSlackConfig: (webhookUrl: string) => axios.post('/notifications/config/slack', { webhookUrl }),
  testNotification: (channel: string) => axios.post(`/notifications/test/${channel}`),
  sendManualAlert: (alert: any) => axios.post('/notifications/send', alert),
};
