import { useState } from 'react';
import { useRouter } from 'next/router';
import { useTheme } from '@/contexts/ThemeContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { dark } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      const { user } = await res.json();
      localStorage.setItem('user', JSON.stringify(user));
      router.push('/');
    } else {
      setError('Invalid credentials');
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: dark ? '#000' : '#fff' }}
    >
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold mb-2" style={{ color: dark ? '#fff' : '#000' }}>
            Audit System
          </h1>
          <p className="text-sm" style={{ color: dark ? '#a1a1aa' : '#71717a' }}>
            Sign in to your account
          </p>
        </div>

        {/* Login Form */}
        <div 
          className="border rounded-lg p-8"
          style={{
            borderColor: dark ? '#27272a' : '#e4e4e7',
            background: dark ? '#000' : '#fff',
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: dark ? '#a1a1aa' : '#71717a' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  background: dark ? '#000' : '#fff',
                  color: dark ? '#fff' : '#000',
                  borderColor: dark ? '#27272a' : '#e4e4e7',
                }}
                className="w-full px-4 py-2.5 border rounded-lg focus:outline-none transition"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: dark ? '#a1a1aa' : '#71717a' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  background: dark ? '#000' : '#fff',
                  color: dark ? '#fff' : '#000',
                  borderColor: dark ? '#27272a' : '#e4e4e7',
                }}
                className="w-full px-4 py-2.5 border rounded-lg focus:outline-none transition"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div 
                className="px-4 py-3 border rounded-lg"
                style={{
                  background: dark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
                  borderColor: dark ? '#7f1d1d' : '#fecaca',
                }}
              >
                <p className="text-sm" style={{ color: dark ? '#f87171' : '#dc2626' }}>{error}</p>
              </div>
            )}

            <button
              type="submit"
              style={{
                background: dark ? '#fff' : '#000',
                color: dark ? '#000' : '#fff',
              }}
              className="w-full py-2.5 rounded-lg font-medium hover:opacity-90 transition"
            >
              Sign In
            </button>
          </form>
        </div>

        {/* Demo Credentials */}
        <div className="mt-8 p-6 border border-gray-200 dark:border-gray-800 rounded-lg bg-gray-50 dark:bg-gray-900/50">
          <p className="text-sm font-semibold mb-3">Demo Credentials:</p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Admin:</span>
              <code className="px-2 py-1 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded text-xs">
                admin@edu.com / admin123
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Dean:</span>
              <code className="px-2 py-1 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded text-xs">
                dean@edu.com / dean123
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Faculty:</span>
              <code className="px-2 py-1 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded text-xs">
                faculty@edu.com / faculty123
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
