'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface RecordType {
  id: number;
  [key: string]: any;
}

export default function Database() {
  const [table, setTable] = useState<'users' | 'courses'>('users');
  const [records, setRecords] = useState<RecordType[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [creating, setCreating] = useState(false);
  const { dark } = useTheme();

  useEffect(() => {
    loadRecords();
  }, [table]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/tables/${table}`);
      
      if (!res.ok) {
        const errorData = await res.json();
        if (res.status === 503 && errorData.code === 'DB_CONNECTION_ERROR') {
          setError('Database not connected. Please configure database settings first.');
          setRecords([]);
          return;
        }
        throw new Error(errorData.error || 'Failed to fetch records');
      }
      
      const data = await res.json();
      setRecords(data || []);
    } catch (err: any) {
      console.error('Error fetching records:', err);
      setError(err.message || 'Failed to load records. Please check your database connection.');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setError(null);
      const res = await fetch(`/api/tables/${table}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        if (res.status === 503) {
          setError('Database not connected. Please configure database settings first.');
          return;
        }
        throw new Error(errorData.error || 'Failed to create record');
      }
      
      setFormData({});
      setCreating(false);
      loadRecords();
    } catch (err: any) {
      console.error('Error creating record:', err);
      setError(err.message || 'Failed to create record. Please check your database connection.');
    }
  };

  const handleUpdate = async (id: number) => {
    try {
      setError(null);
      const res = await fetch(`/api/tables/${table}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        if (res.status === 503) {
          setError('Database not connected. Please configure database settings first.');
          return;
        }
        throw new Error(errorData.error || 'Failed to update record');
      }
      
      setEditing(null);
      setFormData({});
      loadRecords();
    } catch (err: any) {
      console.error('Error updating record:', err);
      setError(err.message || 'Failed to update record. Please check your database connection.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    try {
      setError(null);
      const res = await fetch(`/api/tables/${table}/${id}`, { method: 'DELETE' });
      
      if (!res.ok) {
        const errorData = await res.json();
        if (res.status === 503) {
          setError('Database not connected. Please configure database settings first.');
          return;
        }
        throw new Error(errorData.error || 'Failed to delete record');
      }
      
      loadRecords();
    } catch (err: any) {
      console.error('Error deleting record:', err);
      setError(err.message || 'Failed to delete record. Please check your database connection.');
    }
  };

  const getFields = () =>
    table === 'users'
      ? [
          { name: 'name', label: 'Name', type: 'text' },
          { name: 'email', label: 'Email', type: 'email' },
          { name: 'role', label: 'Role', type: 'select', options: ['Admin', 'Dean', 'Faculty', 'Student'] },
          { name: 'rollNo', label: 'Roll No', type: 'text', showIf: (role: string) => role === 'Student' },
          { name: 'marks', label: 'Marks', type: 'number', showIf: (role: string) => role === 'Student' },
        ]
      : [
          { name: 'name', label: 'Course Name', type: 'text' },
          { name: 'code', label: 'Course Code', type: 'text' },
          { name: 'credits', label: 'Credits', type: 'number' },
          { name: 'description', label: 'Description', type: 'text' },
        ];

  const fields = getFields();

  return (
    <div className="space-y-8" style={{ color: dark ? '#fff' : '#000' }}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight" style={{ color: dark ? '#fff' : '#000' }}>
            Database Management
          </h1>
          <p className="text-lg mt-2" style={{ color: dark ? '#a1a1aa' : '#71717a' }}>
            {loading ? 'Loading...' : `${records.length} ${table === 'users' ? 'user' : 'course'}${records.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <select
          value={table}
          onChange={(e) => {
            setTable(e.target.value as 'users' | 'courses');
            setCreating(false);
            setEditing(null);
          }}
          style={{
            background: dark ? '#000' : '#fff',
            color: dark ? '#fff' : '#000',
            borderColor: dark ? '#27272a' : '#e4e4e7',
          }}
          className="px-4 py-2 border rounded-lg focus:outline-none transition"
        >
          <option value="users">Users</option>
          <option value="courses">Courses</option>
        </select>
      </div>

      {/* Error Display */}
      {error && (
        <div 
          className="border-l-4 p-4 rounded-lg"
          style={{
            borderLeftColor: '#f87171',
            backgroundColor: dark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
            color: dark ? '#fca5a5' : '#dc2626'
          }}
        >
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Create New */}
      <button
        onClick={() => {
          setCreating(true);
          setFormData({});
        }}
        style={{
          background: dark ? '#fff' : '#000',
          color: dark ? '#000' : '#fff',
        }}
        className="px-5 py-2.5 rounded-lg font-medium hover:opacity-80 transition"
      >
        + Create New {table === 'users' ? 'User' : 'Course'}
      </button>

      {creating && (
        <div 
          className="border rounded-lg p-6"
          style={{
            borderColor: dark ? '#27272a' : '#e4e4e7',
            background: dark ? '#000' : '#fff',
          }}
        >
          <h3 className="font-semibold text-lg mb-5" style={{ color: dark ? '#fff' : '#000' }}>
            Create New
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            {fields.map((field) => {
              // Hide student-specific fields if role is not Student
              if (field.showIf && !field.showIf(formData.role)) {
                return null;
              }
              
              return (
                <div key={field.name}>
                  <label className="block text-sm font-medium mb-2" style={{ color: dark ? '#a1a1aa' : '#71717a' }}>
                    {field.label}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      onChange={(e) =>
                        setFormData({ ...formData, [field.name]: e.target.value })
                      }
                      style={{
                        background: dark ? '#000' : '#fff',
                        color: dark ? '#fff' : '#000',
                        borderColor: dark ? '#27272a' : '#e4e4e7',
                      }}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none transition"
                    >
                      <option value="">Select...</option>
                      {field.options?.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      onChange={(e) =>
                        setFormData({ ...formData, [field.name]: e.target.value })
                      }
                      style={{
                        background: dark ? '#000' : '#fff',
                        color: dark ? '#fff' : '#000',
                        borderColor: dark ? '#27272a' : '#e4e4e7',
                      }}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none transition"
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              style={{
                background: dark ? '#fff' : '#000',
                color: dark ? '#000' : '#fff',
              }}
              className="px-4 py-2 rounded-lg hover:opacity-80 transition"
            >
              Create
            </button>
            <button
              onClick={() => setCreating(false)}
              style={{
                borderColor: dark ? '#27272a' : '#e4e4e7',
                color: dark ? '#a1a1aa' : '#71717a',
              }}
              className="px-4 py-2 border rounded-lg hover:opacity-80 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Records */}
      <div className="space-y-3">
        {records.length === 0 ? (
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
              No {table} found. Create one to get started.
            </p>
          </div>
        ) : (
          records.map((record) => (
            <div
              key={record.id}
              className="border rounded-lg p-6 hover:shadow-lg transition-all"
              style={{
                borderColor: dark ? '#27272a' : '#e4e4e7',
                background: dark ? '#000' : '#fff',
              }}
            >
              {editing === record.id ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                    {fields.map((field) => {
                      // Hide student-specific fields if role is not Student
                      if (field.showIf && !field.showIf(formData.role || record.role)) {
                        return null;
                      }
                      
                      return (
                        <div key={field.name}>
                          <label className="block text-sm font-medium mb-2" style={{ color: dark ? '#a1a1aa' : '#71717a' }}>
                            {field.label}
                          </label>
                          {field.type === 'select' ? (
                            <select
                              defaultValue={record[field.name]}
                              onChange={(e) =>
                                setFormData({ ...formData, [field.name]: e.target.value })
                              }
                              style={{
                                background: dark ? '#000' : '#fff',
                                color: dark ? '#fff' : '#000',
                                borderColor: dark ? '#27272a' : '#e4e4e7',
                              }}
                              className="w-full px-3 py-2 border rounded-lg focus:outline-none transition"
                            >
                              {field.options?.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={field.type}
                              defaultValue={record[field.name]}
                              onChange={(e) =>
                                setFormData({ ...formData, [field.name]: e.target.value })
                              }
                              style={{
                                background: dark ? '#000' : '#fff',
                                color: dark ? '#fff' : '#000',
                                borderColor: dark ? '#27272a' : '#e4e4e7',
                              }}
                              className="w-full px-3 py-2 border rounded-lg focus:outline-none transition"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdate(record.id)}
                      style={{
                        background: dark ? '#fff' : '#000',
                        color: dark ? '#000' : '#fff',
                      }}
                      className="px-4 py-2 rounded-lg hover:opacity-80 transition"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditing(null);
                        setFormData({});
                      }}
                      style={{
                        borderColor: dark ? '#27272a' : '#e4e4e7',
                        color: dark ? '#a1a1aa' : '#71717a',
                      }}
                      className="px-4 py-2 border rounded-lg hover:opacity-80 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    {fields.map((field) => {
                      // Hide student-specific fields if role is not Student
                      if (field.showIf && !field.showIf(record.role)) {
                        return null;
                      }
                      
                      return (
                        <div key={field.name}>
                          <span className="text-sm" style={{ color: dark ? '#71717a' : '#a1a1aa' }}>
                            {field.label}:
                          </span>{' '}
                          <span className="font-medium" style={{ color: dark ? '#fff' : '#000' }}>
                            {record[field.name] || 'N/A'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditing(record.id);
                        setFormData(record);
                      }}
                      style={{
                        borderColor: dark ? '#27272a' : '#e4e4e7',
                        color: dark ? '#a1a1aa' : '#71717a',
                      }}
                      className="px-3 py-1.5 text-sm border rounded-lg hover:opacity-80 transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(record.id)}
                      style={{
                        borderColor: dark ? '#7f1d1d' : '#fecaca',
                        color: dark ? '#f87171' : '#dc2626',
                      }}
                      className="px-3 py-1.5 text-sm border rounded-lg hover:opacity-80 transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
