import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  timeout: 12_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const serverMessage =
      error.response?.data?.message ||
      error.response?.data?.errors?.join(', ');
    const message =
      serverMessage ||
      (error.code === 'ECONNABORTED' ? 'Request timed out. Is the API server running?' : null) ||
      error.message ||
      'An unknown error occurred.';

    return Promise.reject(new Error(message));
  }
);

export default api;
