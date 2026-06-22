import { useState } from 'react';
import Dashboard from './Dashboard';
import Login from './Login';

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'));

  const handleLoginSuccess = (newToken) => {
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return <Dashboard onLogout={handleLogout} />;
}
