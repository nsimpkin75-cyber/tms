import { useState, useEffect } from 'react';
import { Shield, RefreshCw, ChevronDown, ChevronUp, User, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';

interface AuditEntry {
  id: string;
  event_type: string;
  actor_id: string | null;
  target_user_id: string | null;
  target_email: string | null;
  ip_address: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor?: { full_name: string } | null;
  target?: { full_name: string } | null;
}

const eventLabels: Record<string, { label: string; color: string }> = {
  account_created: { label: 'Account Created', color: 'bg-blue-100 text-blue-800' },
  admin_password_reset: { label: 'Admin Password Reset', color: 'bg-orange-100 text-orange-800' },
  password_reset_requested: { label: 'Self-Service Reset Requested', color: 'bg-yellow-100 text-yellow-800' },
  password_reset_completed: { label: 'Password Reset Completed', color: 'bg-green-100 text-green-800' },
  password_changed: { label: 'Password Changed', color: 'bg-green-100 text-green-800' },
  account_activated: { label: 'Account Activated', color: 'bg-teal-100 text-teal-800' },
  account_deactivated: { label: 'Account Deactivated', color: 'bg-red-100 text-red-800' },
  login_success: { label: 'Login Success', color: 'bg-gray-100 text-gray-700' },
  login_failed: { label: 'Login Failed', color: 'bg-red-100 text-red-800' },
};

export function SecurityAuditLog() {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    fetchLog();
  }, []);

  async function fetchLog() {
    setLoading(true);
    setError('');
    try {
      const query = supabase
        .from('security_audit_log')
        .select(`
          id, event_type, actor_id, target_user_id, target_email,
          ip_address, metadata, created_at,
          actor:profiles!security_audit_log_actor_id_fkey(full_name),
          target:profiles!security_audit_log_target_user_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setEntries((data as AuditEntry[]) || []);
    } catch (err) {
      setError('Failed to load security audit log.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filteredEntries = filter === 'all' ? entries : entries.filter((e) => e.event_type === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-lg">
            <Shield className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Security Audit Log</h3>
            <p className="text-xs text-slate-500">
              {isAdmin ? 'All security events across all users' : 'Your own security events'}
            </p>
          </div>
        </div>
        <button
          onClick={fetchLog}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {['all', 'account_created', 'admin_password_reset', 'password_reset_requested', 'password_changed'].map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === key
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {key === 'all' ? 'All Events' : (eventLabels[key]?.label ?? key)}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-10 text-slate-400 text-sm">Loading...</div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-sm">No events found.</div>
      ) : (
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
          {filteredEntries.map((entry) => {
            const eventInfo = eventLabels[entry.event_type] ?? { label: entry.event_type, color: 'bg-gray-100 text-gray-700' };
            const isExpanded = expandedId === entry.id;

            return (
              <div key={entry.id} className="bg-white">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-start gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${eventInfo.color}`}>
                        {eventInfo.label}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(entry.created_at), 'dd MMM yyyy HH:mm')}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                      {entry.target?.full_name && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          {entry.target.full_name}
                        </span>
                      )}
                      {entry.target_email && !entry.target?.full_name && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          {entry.target_email}
                        </span>
                      )}
                      {isAdmin && entry.actor?.full_name && (
                        <span className="text-slate-400">
                          by {entry.actor.full_name}
                        </span>
                      )}
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 bg-slate-50 border-t border-slate-100">
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      {entry.target_email && (
                        <>
                          <dt className="text-slate-500 font-medium">Target Email</dt>
                          <dd className="text-slate-700">{entry.target_email}</dd>
                        </>
                      )}
                      {entry.ip_address && (
                        <>
                          <dt className="text-slate-500 font-medium">IP Address</dt>
                          <dd className="text-slate-700 font-mono">{entry.ip_address}</dd>
                        </>
                      )}
                      {entry.metadata && Object.entries(entry.metadata).map(([k, v]) => (
                        <>
                          <dt key={`k-${k}`} className="text-slate-500 font-medium capitalize">{k.replace(/_/g, ' ')}</dt>
                          <dd key={`v-${k}`} className="text-slate-700">{String(v)}</dd>
                        </>
                      ))}
                    </dl>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
