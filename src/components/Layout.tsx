import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTheme } from '@/contexts/ThemeContext';

export default function Layout({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { dark, toggleDark } = useTheme();
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
    setLoading(false);
  }, []);

  const logout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  // Show login page without layout restrictions
  if (router.pathname === '/login') {
    return (
      <div 
        className="min-h-screen transition-colors"
        style={{ 
          background: dark ? '#000' : '#fff',
          color: dark ? '#fff' : '#000'
        }}
      >
        {children}
      </div>
    );
  }

  // Show loading state while checking auth
  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ 
          background: dark ? '#000' : '#fff',
          color: dark ? '#fff' : '#000'
        }}
      >
        <div className="text-sm" style={{ color: dark ? '#71717a' : '#a1a1aa' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen"
      style={{ 
        background: dark ? '#000' : '#fff',
        color: dark ? '#fff' : '#000'
      }}
    >
      {/* Vercel-style Navbar */}
      <nav 
        className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-xl"
        style={{
          borderColor: dark ? '#27272a' : '#e4e4e7',
          background: dark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-8">
              <Link 
                href="/" 
                className="font-semibold text-lg hover:opacity-80 transition-opacity"
                style={{ color: dark ? '#fff' : '#000' }}
              >
                Audit System
              </Link>
              
              {/* Navigation Links */}
              {user && (
                <div className="hidden md:flex items-center gap-1">
                  <NavLink href="/logs" active={router.pathname === '/logs'} dark={dark}>
                    Logs
                  </NavLink>
                  {user.role === 'Admin' && (
                    <NavLink href="/suspicious" active={router.pathname === '/suspicious'} dark={dark}>
                      Suspicious
                    </NavLink>
                  )}
                  <NavLink href="/database" active={router.pathname === '/database'} dark={dark}>
                    Database
                  </NavLink>
                  <NavLink href="/settings" active={router.pathname === '/settings'} dark={dark}>
                    Settings
                  </NavLink>
                </div>
              )}
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-4">
              {user && (
                <div 
                  className="hidden md:flex items-center gap-2 text-sm"
                  style={{ color: dark ? '#a1a1aa' : '#71717a' }}
                >
                  <span className="font-medium" style={{ color: dark ? '#fff' : '#000' }}>{user.name}</span>
                  <span>·</span>
                  <span>{user.role}</span>
                </div>
              )}
              
              {/* Theme Toggle */}
              <button
                onClick={toggleDark}
                className="p-2 rounded-lg transition-colors"
                style={{
                  background: 'transparent',
                  color: dark ? '#fff' : '#000',
                }}
                aria-label="Toggle theme"
              >
                {dark ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              {user && (
                <button
                  onClick={logout}
                  className="text-sm px-3 py-1.5 rounded-lg transition-colors"
                  style={{ color: dark ? '#a1a1aa' : '#71717a' }}
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-6 py-12">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer 
        className="border-t mt-20"
        style={{ borderColor: dark ? '#27272a' : '#e4e4e7' }}
      >
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-sm text-center" style={{ color: dark ? '#a1a1aa' : '#71717a' }}>
            Database Audit System · Built with Next.js
          </div>
        </div>
      </footer>
    </div>
  );
}

function NavLink({ href, active, children, dark }: { href: string; active: boolean; children: ReactNode; dark: boolean }) {
  return (
    <Link
      href={href}
      className="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
      style={{
        background: active ? (dark ? '#18181b' : '#fafafa') : 'transparent',
        color: active ? (dark ? '#fff' : '#000') : (dark ? '#a1a1aa' : '#71717a'),
      }}
    >
      {children}
    </Link>
  );
}
