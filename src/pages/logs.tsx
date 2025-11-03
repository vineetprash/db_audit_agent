'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { format } from 'date-fns';
import { useTheme } from '@/contexts/ThemeContext';

interface AuditLog {
  id: number;
  tableName: string;
  operation: string;
  userName: string;
  oldData?: Record<string, any> | null;
  newData?: Record<string, any> | null;
  timestamp: string;
  readableOld?: string;
  readableNew?: string;
}

export default function Logs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'INSERT' | 'UPDATE' | 'DELETE'>('ALL');
  const { dark } = useTheme();

  useEffect(() => {
    let newSocket: Socket;

    async function init() {
      try {
        // Fetch initial logs
        const res = await fetch('/api/logs');
        const data = await res.json();
        setLogs(data);

        // Connect socket.io
        newSocket = io({
          path: '/api/socket',
          transports: ['websocket', 'polling'],
        });

        newSocket.on('connect', () => {
          console.log('✅ Connected to Socket.IO');
        });

        newSocket.on('disconnect', () => {
          console.log('❌ Disconnected from Socket.IO');
        });

        newSocket.on('connect_error', (error) => {
          console.error('❌ Socket.IO connection error:', error);
        });

        newSocket.on('connected', (data) => {
          console.log('📨 Socket.IO welcomed:', data);
        });

        newSocket.on('audit_log', (log: AuditLog) => {
          console.log('📨 Received audit log:', log);
          setLogs((prev) => [log, ...prev].slice(0, 100));
        });

        // Optional: trigger backend to start stream
        const streamRes = await fetch('/api/logs/stream', { method: 'POST' });
        const streamData = await streamRes.json();
        
        if (!streamData.connected) {
          console.warn('Database not connected:', streamData.message);
        }

        setSocket(newSocket);
      } catch (err) {
        console.error('Error initializing logs:', err);
      }
    }

    init();

    return () => {
      if (newSocket) newSocket.close();
    };
  }, []);

  const filteredLogs =
    filter === 'ALL' ? logs : logs.filter((log) => log.operation === filter);

  return (
    <div className="space-y-8" style={{ color: dark ? '#fff' : '#000' }}>
      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight" style={{ color: dark ? '#fff' : '#000' }}>
          Audit Logs
        </h1>
        <p className="text-lg" style={{ color: dark ? '#a1a1aa' : '#71717a' }}>
          {filteredLogs.length} log{filteredLogs.length !== 1 && 's'} · Realtime monitoring active
        </p>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        {['ALL', 'INSERT', 'UPDATE', 'DELETE'].map((op) => (
          <button
            key={op}
            onClick={() => setFilter(op as any)}
            style={{
              background: filter === op ? (dark ? '#fff' : '#000') : 'transparent',
              color: filter === op ? (dark ? '#000' : '#fff') : (dark ? '#a1a1aa' : '#71717a'),
              border: filter === op ? 'none' : `1px solid ${dark ? '#27272a' : '#e4e4e7'}`,
            }}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-all"
          >
            {op}
          </button>
        ))}
      </div>

      {/* Logs List */}
      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
          <div 
            className="text-center py-20 border border-dashed rounded-lg"
            style={{ borderColor: dark ? '#27272a' : '#e4e4e7' }}
          >
            <div style={{ color: dark ? '#52525b' : '#d4d4d8' }} className="mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p style={{ color: dark ? '#71717a' : '#a1a1aa' }}>
              No audit logs yet. Perform database operations to see logs appear here.
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="border rounded-lg p-6 hover:shadow-lg transition-all"
              style={{ 
                borderColor: dark ? '#27272a' : '#e4e4e7',
                background: dark ? '#000' : '#fff'
              }}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-3 items-center">
                  <span
                    className="px-3 py-1 text-xs font-semibold rounded-full"
                    style={{
                      background: log.operation === 'INSERT' 
                        ? (dark ? 'rgba(34, 197, 94, 0.2)' : '#dcfce7')
                        : log.operation === 'UPDATE'
                        ? (dark ? 'rgba(59, 130, 246, 0.2)' : '#dbeafe')
                        : (dark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2'),
                      color: log.operation === 'INSERT'
                        ? (dark ? '#4ade80' : '#15803d')
                        : log.operation === 'UPDATE'
                        ? (dark ? '#60a5fa' : '#1e40af')
                        : (dark ? '#f87171' : '#991b1b')
                    }}
                  >
                    {log.operation}
                  </span>
                  <span className="font-semibold text-lg" style={{ color: dark ? '#fff' : '#000' }}>
                    {log.tableName}
                  </span>
                </div>
                <span className="text-sm" style={{ color: dark ? '#71717a' : '#a1a1aa' }}>
                  {format(new Date(log.timestamp), 'MMM dd, yyyy · HH:mm:ss')}
                </span>
              </div>

              <div className="text-sm mb-4" style={{ color: dark ? '#a1a1aa' : '#71717a' }}>
                User: <span className="font-medium" style={{ color: dark ? '#fff' : '#000' }}>{log.userName}</span>
              </div>

              {/* Show readable summary if available */}
              {(log.readableOld || log.readableNew) && (
                <div className="mb-4 space-y-2">
                  {log.readableOld && (
                    <div className="text-sm">
                      <span style={{ color: dark ? '#f87171' : '#991b1b' }} className="font-medium">Old:</span>{' '}
                      <span style={{ color: dark ? '#a1a1aa' : '#71717a' }}>{log.readableOld}</span>
                    </div>
                  )}
                  {log.readableNew && (
                    <div className="text-sm">
                      <span style={{ color: dark ? '#4ade80' : '#15803d' }} className="font-medium">New:</span>{' '}
                      <span style={{ color: dark ? '#a1a1aa' : '#71717a' }}>{log.readableNew}</span>
                    </div>
                  )}
                </div>
              )}

              {(log.oldData || log.newData) && (
                <details className="text-sm">
                  <summary 
                    className="cursor-pointer font-medium transition"
                    style={{ color: dark ? '#a1a1aa' : '#71717a' }}
                  >
                    View Data →
                  </summary>
                  <div 
                    className="mt-4 p-4 rounded-lg border overflow-auto"
                    style={{ 
                      background: dark ? '#18181b' : '#fafafa',
                      borderColor: dark ? '#27272a' : '#e4e4e7'
                    }}
                  >
                    <pre className="text-xs font-mono" style={{ color: dark ? '#a1a1aa' : '#52525b' }}>
                      {JSON.stringify(
                        {
                          ...(log.oldData && { old: log.oldData }),
                          ...(log.newData && { new: log.newData }),
                        },
                        null,
                        2
                      )}
                    </pre>
                  </div>
                </details>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
