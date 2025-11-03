import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const { dark } = useTheme();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) {
      router.push('/login');
    } else {
      setUser(JSON.parse(stored));
    }
  }, []);

  if (!user) return null;

  return (
    <div className="space-y-12" style={{ color: dark ? '#fff' : '#000' }}>
      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight" style={{ color: dark ? '#fff' : '#000' }}>
          Welcome back, {user.name}
        </h1>
        <p className="text-lg" style={{ color: dark ? '#a1a1aa' : '#71717a' }}>
          Monitor database activities and detect suspicious behavior in real-time
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card
          title="Audit Logs"
          description="View all database operations in real-time"
          href="/logs"
          dark={dark}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
        {user.role === 'Admin' && (
          <Card
            title="Suspicious Activity"
            description="Real-time threat detection and alerts"
            href="/suspicious"
            dark={dark}
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
          />
        )}
        <Card
          title="Database Management"
          description="Perform CRUD operations on tables"
          href="/database"
          dark={dark}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
          }
        />
        <Card
          title="Settings"
          description="Configure database connections"
          href="/settings"
          dark={dark}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
      </div>
    </div>
  );
}

function Card({ title, description, href, icon, dark }: any) {
  return (
    <Link
      href={href}
      className="group block p-6 border rounded-lg hover:shadow-lg transition-all"
      style={{
        borderColor: dark ? '#27272a' : '#e4e4e7',
      }}
    >
      <div className="flex items-start gap-4">
        <div 
          className="p-2.5 rounded-lg transition-colors"
          style={{
            background: dark ? '#18181b' : '#fafafa',
          }}
        >
          <div style={{ color: dark ? '#fff' : '#000' }}>
            {icon}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold mb-1 transition-colors" style={{ color: dark ? '#fff' : '#000' }}>
            {title}
          </h3>
          <p className="text-sm line-clamp-2" style={{ color: dark ? '#a1a1aa' : '#71717a' }}>
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
}
