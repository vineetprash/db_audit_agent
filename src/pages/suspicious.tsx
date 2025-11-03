'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { format } from 'date-fns';
import { useTheme } from '@/contexts/ThemeContext';

interface SuspiciousActivity {
  id: number;
  logId: number | null;
  message: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  details: any;
  timestamp: string;
}

export default function Suspicious() {
  const [activities, setActivities] = useState<SuspiciousActivity[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const { dark } = useTheme();

  useEffect(() => {
    let newSocket: Socket;

    const init = async () => {
      try {
        // Fetch initial activities
        const res = await fetch('/api/suspicious');
        const data = await res.json();
        setActivities(data);

        // Connect to socket
        newSocket = io({ path: '/api/socket' });

        newSocket.on('connect', () => {
          console.log('✅ Connected to suspicious activity stream');
        });

        newSocket.on('suspicious_activity', (activity: SuspiciousActivity) => {
          setActivities((prev) => [activity, ...prev].slice(0, 100));
        });

        setSocket(newSocket);
      } catch (err) {
        console.error('Error initializing suspicious activity listener:', err);
      }
    };

    init();
    return () => {
      if (newSocket) newSocket.close();
    };
  }, []);

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          borderColor: dark ? '#dc2626' : '#dc2626',
          background: dark ? 'rgba(220, 38, 38, 0.1)' : '#fef2f2',
          color: dark ? '#fca5a5' : '#991b1b'
        };
      case 'HIGH':
        return {
          borderColor: dark ? '#f97316' : '#f97316',
          background: dark ? 'rgba(249, 115, 22, 0.1)' : '#fff7ed',
          color: dark ? '#fdba74' : '#9a3412'
        };
      case 'MEDIUM':
        return {
          borderColor: dark ? '#eab308' : '#eab308',
          background: dark ? 'rgba(234, 179, 8, 0.1)' : '#fefce8',
          color: dark ? '#fde047' : '#854d0e'
        };
      default:
        return {
          borderColor: dark ? '#52525b' : '#a1a1aa',
          background: dark ? 'rgba(82, 82, 91, 0.1)' : '#fafafa',
          color: dark ? '#a1a1aa' : '#52525b'
        };
    }
  };

  return (
    <div className="space-y-8" style={{ color: dark ? '#fff' : '#000' }}>
      <div className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight" style={{ color: dark ? '#fff' : '#000' }}>
          Suspicious Activity
        </h1>
        <p className="text-lg" style={{ color: dark ? '#a1a1aa' : '#71717a' }}>
          Real-time detection of potentially malicious database operations
        </p>
      </div>

      <div className="text-sm" style={{ color: dark ? '#a1a1aa' : '#71717a' }}>
        {activities.length} alert{activities.length !== 1 && 's'} detected
      </div>

      <div className="space-y-3">
        {activities.length === 0 ? (
          <div 
            className="text-center py-20 border border-dashed rounded-lg"
            style={{ borderColor: dark ? '#27272a' : '#e4e4e7' }}
          >
            <div style={{ color: dark ? '#52525b' : '#d4d4d8' }} className="mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <p style={{ color: dark ? '#71717a' : '#a1a1aa' }}>
              No suspicious activity detected
            </p>
          </div>
        ) : (
          activities.map((activity) => {
            const styles = getSeverityStyles(activity.severity);
            return (
              <div
                key={activity.id}
                className="border-l-4 rounded-lg p-6 hover:shadow-lg transition-all"
                style={{
                  borderLeftColor: styles.borderColor,
                  background: styles.background,
                }}
              >
                <div className="flex justify-between items-start mb-3">
                  <span
                    className="px-3 py-1 text-xs font-semibold rounded-full uppercase tracking-wide"
                    style={{
                      background: styles.borderColor,
                      color: dark ? '#000' : '#fff',
                    }}
                  >
                    {activity.severity}
                  </span>
                  <span className="text-sm" style={{ color: dark ? '#71717a' : '#a1a1aa' }}>
                    {format(new Date(activity.timestamp), 'MMM dd, yyyy · HH:mm:ss')}
                  </span>
                </div>

                <p className="text-base font-medium mb-4" style={{ color: dark ? '#fff' : '#000' }}>
                  {activity.message}
                </p>

                {activity.details && (
                  <details className="text-sm">
                    <summary 
                      className="cursor-pointer font-medium transition"
                      style={{ color: dark ? '#a1a1aa' : '#71717a' }}
                    >
                      View Details →
                    </summary>
                    <div 
                      className="mt-4 p-4 rounded-lg border overflow-auto"
                      style={{
                        background: dark ? '#18181b' : '#fafafa',
                        borderColor: dark ? '#27272a' : '#e4e4e7'
                      }}
                    >
                      <pre className="text-xs font-mono" style={{ color: dark ? '#a1a1aa' : '#52525b' }}>
                        {JSON.stringify(activity.details, null, 2)}
                      </pre>
                    </div>
                  </details>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
