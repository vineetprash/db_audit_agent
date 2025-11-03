
import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export default function Settings() {
  const [config, setConfig] = useState({
    host: 'localhost',
    port: '5432',
    database: 'audit_db',
    user: 'postgres',
    password: '',
  });
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const { dark } = useTheme();

  // Load saved credentials on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem('dbConfig');
    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig));
      } catch (e) {
        console.error('Failed to load saved config:', e);
      }
    }
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    setStatus('');

    try {
      const res = await fetch('/api/agent/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          port: parseInt(config.port),
        }),
      });

      if (res.ok) {
        // Save credentials to localStorage on successful connection
        localStorage.setItem('dbConfig', JSON.stringify(config));
        setStatus('✅ Connected successfully! Audit triggers installed.');
      } else {
        const data = await res.json();
        setStatus(`❌ Connection failed: ${data.error}`);
      }
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-8" style={{ color: dark ? '#fff' : '#000' }}>
      <div className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight" style={{ color: dark ? '#fff' : '#000' }}>
          Database Settings
        </h1>
        <p className="text-lg" style={{ color: dark ? '#a1a1aa' : '#71717a' }}>
          Configure and connect to your PostgreSQL database
        </p>
      </div>

      <div 
        className="border rounded-lg p-6 space-y-5"
        style={{
          borderColor: dark ? '#27272a' : '#e4e4e7',
          background: dark ? '#000' : '#fff',
        }}
      >
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: dark ? '#a1a1aa' : '#71717a' }}>
            Host
          </label>
          <input
            type="text"
            value={config.host}
            onChange={(e) => setConfig({ ...config, host: e.target.value })}
            style={{
              background: dark ? '#000' : '#fff',
              color: dark ? '#fff' : '#000',
              borderColor: dark ? '#27272a' : '#e4e4e7',
            }}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none transition"
            placeholder="localhost"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: dark ? '#a1a1aa' : '#71717a' }}>
            Port
          </label>
          <input
            type="text"
            value={config.port}
            onChange={(e) => setConfig({ ...config, port: e.target.value })}
            style={{
              background: dark ? '#000' : '#fff',
              color: dark ? '#fff' : '#000',
              borderColor: dark ? '#27272a' : '#e4e4e7',
            }}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none transition"
            placeholder="5432"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: dark ? '#a1a1aa' : '#71717a' }}>
            Database Name
          </label>
          <input
            type="text"
            value={config.database}
            onChange={(e) => setConfig({ ...config, database: e.target.value })}
            style={{
              background: dark ? '#000' : '#fff',
              color: dark ? '#fff' : '#000',
              borderColor: dark ? '#27272a' : '#e4e4e7',
            }}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none transition"
            placeholder="audit_db"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: dark ? '#a1a1aa' : '#71717a' }}>
            Username
          </label>
          <input
            type="text"
            value={config.user}
            onChange={(e) => setConfig({ ...config, user: e.target.value })}
            style={{
              background: dark ? '#000' : '#fff',
              color: dark ? '#fff' : '#000',
              borderColor: dark ? '#27272a' : '#e4e4e7',
            }}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none transition"
            placeholder="postgres"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: dark ? '#a1a1aa' : '#71717a' }}>
            Password
          </label>
          <input
            type="password"
            value={config.password}
            onChange={(e) => setConfig({ ...config, password: e.target.value })}
            style={{
              background: dark ? '#000' : '#fff',
              color: dark ? '#fff' : '#000',
              borderColor: dark ? '#27272a' : '#e4e4e7',
            }}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none transition"
            placeholder="••••••••"
          />
        </div>

        <button
          onClick={handleConnect}
          disabled={loading}
          style={{
            background: dark ? '#fff' : '#000',
            color: dark ? '#000' : '#fff',
            opacity: loading ? 0.5 : 1,
          }}
          className="w-full py-2.5 rounded-lg font-medium hover:opacity-80 transition disabled:cursor-not-allowed"
        >
          {loading ? 'Connecting...' : 'Connect & Install Audit Triggers'}
        </button>

        {status && (
          <div 
            className="p-4 rounded-lg border"
            style={{
              background: dark ? '#18181b' : '#fafafa',
              borderColor: dark ? '#27272a' : '#e4e4e7',
            }}
          >
            <p className="text-sm" style={{ color: dark ? '#fff' : '#000' }}>{status}</p>
          </div>
        )}
      </div>

      <div 
        className="border rounded-lg p-6"
        style={{
          borderColor: dark ? '#27272a' : '#e4e4e7',
          background: dark ? '#000' : '#fff',
        }}
      >
        <h3 className="font-semibold text-lg mb-4" style={{ color: dark ? '#fff' : '#000' }}>
          What happens when you connect?
        </h3>
        <ul className="space-y-2 text-sm" style={{ color: dark ? '#a1a1aa' : '#71717a' }}>
          <li>• Audit triggers are automatically installed on all tables</li>
          <li>• Real-time monitoring starts via pg_notify</li>
          <li>• All INSERT, UPDATE, DELETE operations are logged</li>
          <li>• Suspicious activity detection is activated</li>
        </ul>
      </div>
    </div>
  );
}
