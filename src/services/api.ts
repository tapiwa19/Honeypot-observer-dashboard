import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001/api';

export const api = {
  // Dashboard
  getDashboardStats: () => axios.get(`${API_BASE_URL}/dashboard/stats`),
  getRecentAttacks: () => axios.get(`${API_BASE_URL}/dashboard/attacks`),
  
  // Sessions
  getLiveSessions: () => axios.get(`${API_BASE_URL}/sessions/live`),
  
  // Analytics
  getAnalyticsTimeline: () => axios.get(`${API_BASE_URL}/analytics/timeline`),
  getTopCountries: () => axios.get(`${API_BASE_URL}/analytics/countries`),
  
  // Credentials
  getCredentials: () => axios.get(`${API_BASE_URL}/credentials`),
  
  // Health
  getHealth: () => axios.get(`${API_BASE_URL}/health`),
};