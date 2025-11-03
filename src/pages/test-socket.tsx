'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useTheme } from '@/contexts/ThemeContext';

export default function TestSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const { dark } = useTheme();

  useEffect(() => {
    let newSocket: Socket;

    async function init() {
      try {
        // Initialize Socket.IO connection
        await fetch('/api/socket');
        
        // Connect socket.io
        newSocket = io({
          path: '/api/socket',
          transports: ['websocket', 'polling'],
        });

        newSocket.on('connect', () => {
          console.log('✅ Connected to Socket.IO');
          setConnected(true);
          setMessages(prev => [...prev, 'Connected to Socket.IO']);
        });

        newSocket.on('disconnect', () => {
          console.log('❌ Disconnected from Socket.IO');
          setConnected(false);
          setMessages(prev => [...prev, 'Disconnected from Socket.IO']);
        });

        newSocket.on('connect_error', (error) => {
          console.error('❌ Socket.IO connection error:', error);
          setMessages(prev => [...prev, `Connection error: ${error.message}`]);
        });

        newSocket.on('connected', (data) => {
          console.log('📨 Received welcome:', data);
          setMessages(prev => [...prev, `Welcome: ${data.message} (${data.socketId})`]);
        });

        newSocket.on('test_response', (data) => {
          console.log('📨 Test response:', data);
          setMessages(prev => [...prev, `Test response: ${data.message}`]);
        });

        newSocket.on('audit_log', (log) => {
          console.log('📨 Received audit log:', log);
          setMessages(prev => [...prev, `Audit log: ${log.operation} on ${log.tableName}`]);
        });

        // Start audit listener
        const streamRes = await fetch('/api/logs/stream', { method: 'POST' });
        const streamData = await streamRes.json();
        setMessages(prev => [...prev, `Stream response: ${streamData.message}`]);

        setSocket(newSocket);
      } catch (err) {
        console.error('Error initializing socket:', err);
        setMessages(prev => [...prev, `Error: ${err}`]);
      }
    }

    init();

    return () => {
      if (newSocket) newSocket.close();
    };
  }, []);

  const testMessage = () => {
    if (socket) {
      socket.emit('test', 'Hello from client');
      setMessages(prev => [...prev, 'Sent test message']);
    }
  };

  const testAudit = async () => {
    try {
      setMessages(prev => [...prev, 'Testing audit system...']);
      const res = await fetch('/api/test-audit', { method: 'POST' });
      const data = await res.json();
      setMessages(prev => [...prev, `Audit test result: ${data.message}`]);
      if (data.auditLogs) {
        setMessages(prev => [...prev, `Audit logs found: ${data.auditLogs.length}`]);
      }
    } catch (err) {
      setMessages(prev => [...prev, `Audit test failed: ${err}`]);
    }
  };

  const debugTriggers = async () => {
    try {
      setMessages(prev => [...prev, 'Debugging triggers...']);
      const res = await fetch('/api/debug-triggers', { method: 'POST' });
      const data = await res.json();
      setMessages(prev => [...prev, `Triggers found: ${data.allTriggers?.length || 0}`]);
      setMessages(prev => [...prev, `User triggers: ${data.userTriggers?.length || 0}`]);
      setMessages(prev => [...prev, `Audit function exists: ${data.auditFunctionExists}`]);
      setMessages(prev => [...prev, `Audit logs after test: ${data.auditLogs?.length || 0}`]);
      console.log('Debug data:', data);
    } catch (err) {
      setMessages(prev => [...prev, `Debug failed: ${err}`]);
    }
  };

  return (
    <div className="space-y-8" style={{ color: dark ? '#fff' : '#000' }}>
      <h1 className="text-4xl font-semibold">Socket.IO Test</h1>
      
      <div className="space-y-4">
        <div>
          Status: <span style={{ color: connected ? '#4ade80' : '#f87171' }}>
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        <button
          onClick={async () => {
            try {
              setMessages(prev => [...prev, 'Testing CRUD simulation...']);
              const res = await fetch('/api/crud-simulation', { method: 'POST' });
              const data = await res.json();
              setMessages(prev => [...prev, `CRUD simulation worked: ${data.crudWorked}`]);
              setMessages(prev => [...prev, `CRUD audit logs: ${data.auditLogs?.length || 0}`]);
              setMessages(prev => [...prev, `Triggers found: ${data.triggersFound?.length || 0}`]);
              console.log('CRUD simulation data:', data);
            } catch (err) {
              setMessages(prev => [...prev, `CRUD simulation failed: ${err}`]);
            }
          }}
          className="px-4 py-2 rounded-lg mb-4"
          style={{
            background: dark ? '#10b981' : '#059669',
            color: '#fff'
          }}
        >
          Test CRUD Simulation
        </button>
        
        <button
          onClick={testMessage}
          disabled={!connected}
          className="px-4 py-2 rounded-lg mr-4"
          style={{
            background: connected ? (dark ? '#fff' : '#000') : '#555',
            color: connected ? (dark ? '#000' : '#fff') : '#aaa',
            cursor: connected ? 'pointer' : 'not-allowed'
          }}
        >
          Send Test Message
        </button>

        <button
          onClick={testAudit}
          className="px-4 py-2 rounded-lg mr-4"
          style={{
            background: dark ? '#4ade80' : '#16a34a',
            color: dark ? '#000' : '#fff'
          }}
        >
          Test Audit System
        </button>

        <button
          onClick={debugTriggers}
          className="px-4 py-2 rounded-lg mr-4"
          style={{
            background: dark ? '#f59e0b' : '#d97706',
            color: dark ? '#000' : '#fff'
          }}
        >
          Debug Triggers
        </button>

        <button
          onClick={async () => {
            try {
              setMessages(prev => [...prev, 'Testing raw trigger...']);
              const res = await fetch('/api/raw-trigger-test', { method: 'POST' });
              const data = await res.json();
              setMessages(prev => [...prev, `Raw trigger worked: ${data.triggerWorked}`]);
              setMessages(prev => [...prev, `Raw audit logs: ${data.auditLogs?.length || 0}`]);
            } catch (err) {
              setMessages(prev => [...prev, `Raw test failed: ${err}`]);
            }
          }}
          className="px-4 py-2 rounded-lg mr-4"
          style={{
            background: dark ? '#ef4444' : '#dc2626',
            color: '#fff'
          }}
        >
          Raw Trigger Test
        </button>

        <button
          onClick={async () => {
            try {
              setMessages(prev => [...prev, 'Testing connections...']);
              const res = await fetch('/api/connection-test', { method: 'POST' });
              const data = await res.json();
              setMessages(prev => [...prev, `DB test logs: ${data.dbConnectionTest?.auditLogs?.length || 0}`]);
              setMessages(prev => [...prev, `Post-audit logs: ${data.postAuditTest?.auditLogs?.length || 0}`]);
              console.log('Connection test data:', data);
            } catch (err) {
              setMessages(prev => [...prev, `Connection test failed: ${err}`]);
            }
          }}
          className="px-4 py-2 rounded-lg"
          style={{
            background: dark ? '#8b5cf6' : '#7c3aed',
            color: '#fff'
          }}
        >
          Test Connections
        </button>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Messages:</h2>
        <div 
          className="border rounded-lg p-4 max-h-96 overflow-y-auto"
          style={{ 
            borderColor: dark ? '#27272a' : '#e4e4e7',
            background: dark ? '#000' : '#fff'
          }}
        >
          {messages.map((msg, i) => (
            <div key={i} className="text-sm font-mono" style={{ color: dark ? '#a1a1aa' : '#71717a' }}>
              {new Date().toLocaleTimeString()}: {msg}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}