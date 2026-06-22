import { useState } from 'react';
import { Truck, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import api from './api/axios';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      const { data } = await api.post('/api/auth/login', { email, password });
      if (data.success && data.token) {
        localStorage.setItem('token', data.token);
        onLoginSuccess(data.token);
      } else {
        setError(data.message || 'Login failed.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#04091E] flex items-center justify-center p-4" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="w-full max-w-md bg-[#0A1845] border border-white/10 rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#E8620A] to-[#FF8C00] flex items-center justify-center shadow-lg">
            <Truck size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">EVERESTIA</h1>
            <p className="text-[#7A8BB5] text-sm mt-0.5">Ventures Admin Portal</p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-950/40 px-4 py-3 text-red-300 text-sm">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[#7A8BB5] text-xs font-semibold uppercase tracking-wider block" htmlFor="email">
              Email Address
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7A8BB5]" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@everestia.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder-white/20
                           focus:border-[#E8620A] focus:bg-white/[0.08] focus:ring-1 focus:ring-[#E8620A] outline-none transition-all text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[#7A8BB5] text-xs font-semibold uppercase tracking-wider block" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7A8BB5]" />
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder-white/20
                           focus:border-[#E8620A] focus:bg-white/[0.08] focus:ring-1 focus:ring-[#E8620A] outline-none transition-all text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#E8620A] hover:bg-[#FF8C00] text-white font-semibold rounded-xl py-3 text-sm
                       transition-colors shadow-lg shadow-orange-500/10 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
