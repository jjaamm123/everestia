import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ?? '',
  timeout: 12_000,
  headers: {
    'Content-Type': 'application/json',
    'x-admin-api-key': import.meta.env.VITE_ADMIN_KEY ?? '',
  },
});

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
