export interface User {
  id: string;
  email: string;
  role: 'Admin' | 'Dean' | 'Faculty';
  name: string;
}

export const DEMO_USERS: Record<string, { password: string; user: User }> = {
  'admin@edu.com': {
    password: 'admin123',
    user: { id: '1', email: 'admin@edu.com', role: 'Admin', name: 'Admin User' },
  },
  'dean@edu.com': {
    password: 'dean123',
    user: { id: '2', email: 'dean@edu.com', role: 'Dean', name: 'Dean Smith' },
  },
  'faculty@edu.com': {
    password: 'faculty123',
    user: { id: '3', email: 'faculty@edu.com', role: 'Faculty', name: 'Prof. Johnson' },
  },
};

export const authenticate = (email: string, password: string): User | null => {
  const account = DEMO_USERS[email];
  if (account && account.password === password) {
    return account.user;
  }
  return null;
};