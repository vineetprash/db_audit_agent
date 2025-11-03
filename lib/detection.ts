export interface DetectionResult {
  isSuspicious: boolean;
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  details: Record<string, any>;
}

const activityTracker = new Map<string, number>();

export function detectSuspiciousActivity(log: any): DetectionResult | null {
  const now = Date.now();
  const key = `${log.user_name}_${log.table_name}`;

  // Track activity rate
  const lastActivity = activityTracker.get(key) || 0;
  activityTracker.set(key, now);

  // Rule 1: Rapid successive operations (< 1 second)
  if (now - lastActivity < 1000 && log.operation === 'DELETE') {
    return {
      isSuspicious: true,
      message: `Rapid DELETE operations detected from ${log.user_name}`,
      severity: 'HIGH',
      details: { user: log.user_name, table: log.table_name, operation: log.operation },
    };
  }

  // Rule 2: Mass deletion detection
  if (log.operation === 'DELETE') {
    return {
      isSuspicious: true,
      message: `DELETE operation detected on ${log.table_name}`,
      severity: 'MEDIUM',
      details: { user: log.user_name, table: log.table_name, deletedData: log.old_data },
    };
  }

  // Rule 3: Critical field updates
  if (log.operation === 'UPDATE' && log.table_name === 'User') {
    const oldData = log.old_data || {};
    const newData = log.new_data || {};
    
    if (oldData.role !== newData.role) {
      return {
        isSuspicious: true,
        message: `Role modification detected for user`,
        severity: 'CRITICAL',
        details: { 
          user: log.user_name, 
          oldRole: oldData.role, 
          newRole: newData.role 
        },
      };
    }
  }

  return null;
}