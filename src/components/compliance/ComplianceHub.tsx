import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Upload,
  FileText,
  Filter,
  Search,
  Download,
  Bell,
  ChevronDown,
  ChevronUp,
  Award,
  Users,
  Building2,
  TrendingUp,
  Settings,
  Trash2,
  Plus,
  X,
  Check,
  Star,
} from 'lucide-react';
import { supabase, Profile } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface ComplianceItem {
  id: string;
  name: string;
  description: string;
  item_type: 'compliance' | 'competency';
  requirement_type: 'mandatory' | 'essential' | 'optional';
  regulatory_body: string | null;
  evidence_required: boolean;
  expiry_months: number | null;
  renewal_cycle: string | null;
  sort_order: number;
  is_active: boolean;
}

interface ComplianceRecord {
  id: string;
  profile_id: string;
  compliance_item_id: string;
  status: 'compliant' | 'expiring_soon' | 'non_compliant' | 'pending_verification' | 'not_started';
  evidence_file_path: string | null;
  evidence_file_name: string | null;
  completion_date: string | null;
  expiry_date: string | null;
  self_assessment_rating: number | null;
  manager_verified: boolean;
  manager_verified_by: string | null;
  manager_verified_at: string | null;
  manager_notes: string | null;
  employee_name?: string;
  employee_email?: string;
  job_title?: string;
  department?: string;
  item_name?: string;
  item_type?: 'compliance' | 'competency';
  requirement_type?: 'mandatory' | 'essential' | 'optional';
  regulatory_body?: string | null;
  expiry_months?: number | null;
  evidence_required?: boolean;
}

type Tab = 'employee' | 'manager' | 'executive' | 'admin';

const STATUS_CONFIG = {
  compliant: { label: 'Compliant', color: 'green', icon: CheckCircle2, bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },
  expiring_soon: { label: 'Expiring Soon', color: 'amber', icon: Clock, bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  non_compliant: { label: 'Non-Compliant', color: 'red', icon: XCircle, bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  pending_verification: { label: 'Pending Verification', color: 'blue', icon: Upload, bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  not_started: { label: 'Not Started', color: 'gray', icon: Circle, bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', dot: 'bg-gray-400' },
};

import { Circle } from 'lucide-react';

const RATING_LABELS = ['', 'Foundational', 'Developing', 'Proficient', 'Expert'];

function StatusBadge({ status }: { status: ComplianceRecord['status'] }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text} ${cfg.border} border`}>
      <Icon className="w-3.5 h-3.5" />
      {cfg.label}
    </span>
  );
}

function ProgressDonut({ compliant, total, size = 120 }: { compliant: number; total: number; size?: number }) {
  const percentage = total > 0 ? Math.round((compliant / total) * 100) : 0;
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const color = percentage >= 80 ? '#16a34a' : percentage >= 50 ? '#d97706' : '#dc2626';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-gray-900">{percentage}%</span>
        <span className="text-xs text-gray-500">{compliant}/{total}</span>
      </div>
    </div>
  );
}

export default function ComplianceHub({ embedded = false }: { embedded?: boolean }) {
  const { profile, effectiveProfile, resolvedDashboardRole } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('employee');
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [records, setRecords] = useState<ComplianceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamRecords, setTeamRecords] = useState<ComplianceRecord[]>([]);
  const [allRecords, setAllRecords] = useState<ComplianceRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDept, setFilterDept] = useState<string>('all');
  const [departments, setDepartments] = useState<string[]>([]);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [adminItems, setAdminItems] = useState<ComplianceItem[]>([]);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ComplianceItem | null>(null);
  const [roleRequirements, setRoleRequirements] = useState<any[]>([]);
  const [jobFamilies, setJobFamilies] = useState<any[]>([]);
  const [roleReqMap, setRoleReqMap] = useState<Record<string, string[]>>({});
  const [currentRoleTitle, setCurrentRoleTitle] = useState<string | null>(null);

  const isManager = effectiveProfile?.role === 'manager' || effectiveProfile?.role === 'dept_lead';
  const isLeadership = effectiveProfile?.role === 'leadership' || effectiveProfile?.role === 'senior';
  const isAdmin = profile?.role === 'admin' || profile?.admin_type != null;

  useEffect(() => {
    determineInitialTab();
    fetchComplianceItems();
    fetchJobFamilies();
    fetchRoleRequirements();
  }, []);

  useEffect(() => {
    if (items.length > 0 && Object.keys(roleReqMap).length > 0) {
      fetchMyRecords();
      if (isManager) fetchTeamRecords();
      if (isLeadership || isAdmin) fetchAllRecords();
    }
  }, [items, roleReqMap, effectiveProfile?.id]);

 function determineInitialTab() {
    const role = effectiveProfile?.role;
    if (embedded && (role === 'admin' || profile?.admin_type != null)) {
      // When embedded, admins start on employee view (admin controls are in Admin Portal)
      setActiveTab('employee');
    } else if (role === 'admin' || profile?.admin_type != null) {
      setActiveTab('admin');
    } else if (role === 'leadership' || role === 'senior') {
      setActiveTab('executive');
    } else if (role === 'manager' || role === 'dept_lead') {
      setActiveTab('manager');
    } else {
      setActiveTab('employee');
    }
  }

  async function fetchComplianceItems() {
    try {
      const { data } = await supabase
        .from('compliance_items')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (data) {
        setItems(data as ComplianceItem[]);
        setAdminItems(data as ComplianceItem[]);
      }
    } catch (error) {
      console.error('Error fetching compliance items:', error);
    }
  }

  async function fetchJobFamilies() {
    try {
      const { data } = await supabase.from('job_families').select('id, title, department').order('title');
      if (data) {
        setJobFamilies(data);
        const depts = [...new Set(data.map((j: any) => j.department).filter(Boolean))] as string[];
        setDepartments(depts);
        if (effectiveProfile?.job_family_id) {
          const jf = data.find((j: any) => j.id === effectiveProfile.job_family_id);
          if (jf) setCurrentRoleTitle(jf.title);
        }
      }
    } catch (error) {
      console.error('Error fetching job families:', error);
    }
  }

  async function fetchRoleRequirements() {
    try {
      const { data } = await supabase
        .from('compliance_role_requirements')
        .select('compliance_item_id, job_family_id, requirement_type, is_active')
        .eq('is_active', true);
      if (data) {
        setRoleRequirements(data);
        const map: Record<string, string[]> = {};
        data.forEach((rr: any) => {
          if (!map[rr.job_family_id]) map[rr.job_family_id] = [];
          map[rr.job_family_id].push(rr.compliance_item_id);
        });
        setRoleReqMap(map);
      }
    } catch (error) {
      console.error('Error fetching role requirements:', error);
    }
  }

  async function fetchMyRecords() {
    if (!effectiveProfile?.id) return;
    try {
      setLoading(true);
      const { data: existingRecords } = await supabase
        .from('compliance_records')
        .select(`
          *,
          item:compliance_items(id, name, item_type, requirement_type, regulatory_body, expiry_months, evidence_required)
        `)
        .eq('profile_id', effectiveProfile.id);

      const myRoleItems = getItemsForRole(effectiveProfile.job_family_id);
      const recordMap = new Map((existingRecords || []).map((r: any) => [r.compliance_item_id, r]));
      const merged: ComplianceRecord[] = myRoleItems.map(item => {
        const rec = recordMap.get(item.id);
        return rec
          ? {
              ...rec,
              item_name: item.name,
              item_type: item.item_type,
              requirement_type: item.requirement_type,
              regulatory_body: item.regulatory_body,
              expiry_months: item.expiry_months,
              evidence_required: item.evidence_required,
            }
          : {
              id: `placeholder-${item.id}`,
              profile_id: effectiveProfile.id,
              compliance_item_id: item.id,
              status: 'not_started',
              evidence_file_path: null,
              evidence_file_name: null,
              completion_date: null,
              expiry_date: null,
              self_assessment_rating: null,
              manager_verified: false,
              manager_verified_by: null,
              manager_verified_at: null,
              manager_notes: null,
              item_name: item.name,
              item_type: item.item_type,
              requirement_type: item.requirement_type,
              regulatory_body: item.regulatory_body,
              expiry_months: item.expiry_months,
              evidence_required: item.evidence_required,
            };
      });
      setRecords(merged);
    } catch (error) {
      console.error('Error fetching my records:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTeamRecords() {
    if (!effectiveProfile?.id) return;
    try {
      const { data: teamMembers } = await supabase
        .from('profiles')
        .select('id, full_name, email, job_title, department, job_family_id')
        .eq('manager_id', effectiveProfile.id);

      if (!teamMembers || teamMembers.length === 0) {
        setTeamRecords([]);
        return;
      }

      const memberIds = teamMembers.map(m => m.id);
      const { data: recs } = await supabase
        .from('compliance_records')
        .select(`
          *,
          item:compliance_items(id, name, item_type, requirement_type, regulatory_body, expiry_months, evidence_required)
        `)
        .in('profile_id', memberIds);

      const memberMap = new Map(teamMembers.map(m => [m.id, m]));
      const shaped: ComplianceRecord[] = (recs || []).map((r: any) => {
        const member = memberMap.get(r.profile_id);
        return {
          ...r,
          employee_name: member?.full_name,
          employee_email: member?.email,
          job_title: member?.job_title,
          department: member?.department,
          item_name: r.item?.name,
          item_type: r.item?.item_type,
          requirement_type: r.item?.requirement_type,
          regulatory_body: r.item?.regulatory_body,
          expiry_months: r.item?.expiry_months,
          evidence_required: r.item?.evidence_required,
        };
      });

      // Build gap records: for each team member, find required items with no record
      const gapRecords: ComplianceRecord[] = [];
      teamMembers.forEach((member: any) => {
        const requiredItemIds = roleReqMap[member.job_family_id] || [];
        const existingItemIds = new Set((recs || []).filter((r: any) => r.profile_id === member.id).map((r: any) => r.compliance_item_id));
        requiredItemIds.forEach((itemId: string) => {
          if (!existingItemIds.has(itemId)) {
            const item = items.find(i => i.id === itemId);
            if (item) {
              gapRecords.push({
                id: `gap-${member.id}-${itemId}`,
                profile_id: member.id,
                compliance_item_id: itemId,
                status: 'not_started',
                evidence_file_path: null,
                evidence_file_name: null,
                completion_date: null,
                expiry_date: null,
                self_assessment_rating: null,
                manager_verified: false,
                manager_verified_by: null,
                manager_verified_at: null,
                manager_notes: null,
                employee_name: member.full_name,
                employee_email: member.email,
                job_title: member.job_title,
                department: member.department,
                item_name: item.name,
                item_type: item.item_type,
                requirement_type: item.requirement_type,
                regulatory_body: item.regulatory_body,
                expiry_months: item.expiry_months,
                evidence_required: item.evidence_required,
              });
            }
          }
        });
      });
      setTeamRecords([...shaped, ...gapRecords]);
    } catch (error) {
      console.error('Error fetching team records:', error);
    }
  }

  async function fetchAllRecords() {
    try {
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, job_title, department, job_family_id, role');

      if (!allProfiles) {
        setAllRecords([]);
        return;
      }

      const { data: recs } = await supabase
        .from('compliance_records')
        .select(`
          *,
          item:compliance_items(id, name, item_type, requirement_type, regulatory_body, expiry_months, evidence_required)
        `);

      const profileMap = new Map(allProfiles.map(p => [p.id, p]));
      const shaped: ComplianceRecord[] = (recs || []).map((r: any) => {
        const p = profileMap.get(r.profile_id);
        return {
          ...r,
          employee_name: p?.full_name,
          employee_email: p?.email,
          job_title: p?.job_title,
          department: p?.department,
          item_name: r.item?.name,
          item_type: r.item?.item_type,
          requirement_type: r.item?.requirement_type,
          regulatory_body: r.item?.regulatory_body,
          expiry_months: r.item?.expiry_months,
          evidence_required: r.item?.evidence_required,
        };
      });

      // Build gap records for all employees based on their role assignments
      const gapRecords: ComplianceRecord[] = [];
      allProfiles.forEach((p: any) => {
        const requiredItemIds = roleReqMap[p.job_family_id] || [];
        const existingItemIds = new Set((recs || []).filter((r: any) => r.profile_id === p.id).map((r: any) => r.compliance_item_id));
        requiredItemIds.forEach((itemId: string) => {
          if (!existingItemIds.has(itemId)) {
            const item = items.find(i => i.id === itemId);
            if (item) {
              gapRecords.push({
                id: `gap-${p.id}-${itemId}`,
                profile_id: p.id,
                compliance_item_id: itemId,
                status: 'not_started',
                evidence_file_path: null,
                evidence_file_name: null,
                completion_date: null,
                expiry_date: null,
                self_assessment_rating: null,
                manager_verified: false,
                manager_verified_by: null,
                manager_verified_at: null,
                manager_notes: null,
                employee_name: p.full_name,
                employee_email: p.email,
                job_title: p.job_title,
                department: p.department,
                item_name: item.name,
                item_type: item.item_type,
                requirement_type: item.requirement_type,
                regulatory_body: item.regulatory_body,
                expiry_months: item.expiry_months,
                evidence_required: item.evidence_required,
              });
            }
          }
        });
      });
      setAllRecords([...shaped, ...gapRecords]);
    } catch (error) {
      console.error('Error fetching all records:', error);
    }
  }

  function getItemsForRole(jobFamilyId: string | undefined): ComplianceItem[] {
    if (!jobFamilyId) return items;
    const requiredItemIds = roleReqMap[jobFamilyId];
    if (!requiredItemIds || requiredItemIds.length === 0) return items;
    return items.filter(item => requiredItemIds.includes(item.id));
  }

  async function handleUploadEvidence(itemId: string, file: File) {
    if (!effectiveProfile?.id) return;
    setUploadingFor(itemId);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${effectiveProfile.id}/${itemId}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('compliance-evidence')
        .upload(fileName, file);
      if (uploadError) throw uploadError;

      const item = items.find(i => i.id === itemId);
      const today = new Date();
      const completionDate = today.toISOString().split('T')[0];
      let expiryDate: string | null = null;
      if (item?.expiry_months) {
        const exp = new Date(today);
        exp.setMonth(exp.getMonth() + item.expiry_months);
        expiryDate = exp.toISOString().split('T')[0];
      }

      const existing = records.find(r => r.compliance_item_id === itemId && r.id !== `placeholder-${itemId}`);
      if (existing && !existing.id.startsWith('placeholder-')) {
        await supabase
          .from('compliance_records')
          .update({
            evidence_file_path: fileName,
            evidence_file_name: file.name,
            completion_date: completionDate,
            expiry_date: expiryDate,
            status: 'pending_verification',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('compliance_records').insert({
          profile_id: effectiveProfile.id,
          compliance_item_id: itemId,
          evidence_file_path: fileName,
          evidence_file_name: file.name,
          completion_date: completionDate,
          expiry_date: expiryDate,
          status: 'pending_verification',
        });
      }

      await supabase.from('compliance_audit_log').insert({
        profile_id: effectiveProfile.id,
        compliance_item_id: itemId,
        action: 'evidence_uploaded',
        performed_by: effectiveProfile.id,
        details: { file_name: file.name },
      });

      await fetchMyRecords();
    } catch (error) {
      console.error('Error uploading evidence:', error);
      alert('Failed to upload evidence. Please try again.');
    } finally {
      setUploadingFor(null);
    }
  }

  async function handleSelfAssess(itemId: string, rating: number) {
    if (!effectiveProfile?.id) return;
    try {
      const existing = records.find(r => r.compliance_item_id === itemId && !r.id.startsWith('placeholder-'));
      if (existing) {
        await supabase
          .from('compliance_records')
          .update({ self_assessment_rating: rating, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await supabase.from('compliance_records').insert({
          profile_id: effectiveProfile.id,
          compliance_item_id: itemId,
          self_assessment_rating: rating,
          status: 'pending_verification',
        });
      }
      await fetchMyRecords();
    } catch (error) {
      console.error('Error saving self-assessment:', error);
    }
  }

  async function handleVerify(recordId: string, approved: boolean) {
    if (!profile?.id) return;
    if (recordId.startsWith('gap-') || recordId.startsWith('placeholder-')) return;
    setVerifyingId(recordId);
    try {
      await supabase
        .from('compliance_records')
        .update({
          manager_verified: approved,
          manager_verified_by: profile.id,
          manager_verified_at: new Date().toISOString(),
          status: approved ? 'compliant' : 'non_compliant',
          updated_at: new Date().toISOString(),
        })
        .eq('id', recordId);

      await supabase.from('compliance_audit_log').insert({
        profile_id: (teamRecords.find(r => r.id === recordId) || allRecords.find(r => r.id === recordId))?.profile_id,
        compliance_item_id: (teamRecords.find(r => r.id === recordId) || allRecords.find(r => r.id === recordId))?.compliance_item_id,
        action: approved ? 'verified' : 'rejected',
        performed_by: profile.id,
      });

      if (isManager) await fetchTeamRecords();
      if (isLeadership || isAdmin) await fetchAllRecords();
    } catch (error) {
      console.error('Error verifying record:', error);
    } finally {
      setVerifyingId(null);
    }
  }

  async function handleSendReminder(recordId: string, profileId: string, itemName: string) {
    try {
      if (!recordId.startsWith('gap-') && !recordId.startsWith('placeholder-')) {
        await supabase
          .from('compliance_records')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('id', recordId);
      }

      await supabase.from('compliance_audit_log').insert({
        profile_id: profileId,
        compliance_item_id: (teamRecords.find(r => r.id === recordId) || allRecords.find(r => r.id === recordId))?.compliance_item_id,
        action: 'reminder_sent',
        performed_by: profile?.id,
        details: { item_name: itemName },
      });

      if (isManager) await fetchTeamRecords();
      if (isLeadership || isAdmin) await fetchAllRecords();
    } catch (error) {
      console.error('Error sending reminder:', error);
    }
  }

  function exportCSV(data: ComplianceRecord[], filename: string) {
    const headers = ['Employee', 'Email', 'Department', 'Item', 'Type', 'Requirement', 'Regulatory Body', 'Status', 'Completion Date', 'Expiry Date', 'Self-Assessment', 'Manager Verified'];
    const rows = data.map(r => [
      r.employee_name || '',
      r.employee_email || '',
      r.department || '',
      r.item_name || '',
      r.item_type || '',
      r.requirement_type || '',
      r.regulatory_body || '',
      r.status,
      r.completion_date || '',
      r.expiry_date || '',
      r.self_assessment_rating ? RATING_LABELS[r.self_assessment_rating] : '',
      r.manager_verified ? 'Yes' : 'No',
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Filter logic
  const filterRecords = (data: ComplianceRecord[]) => {
    return data.filter(r => {
      if (searchQuery && !`${r.employee_name || ''} ${r.item_name || ''} ${r.employee_email || ''}`.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterType !== 'all' && r.item_type !== filterType) return false;
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (filterDept !== 'all' && r.department !== filterDept) return false;
      return true;
    });
  };

  // Stats
  const myStats = {
    compliant: records.filter(r => r.status === 'compliant').length,
    expiring: records.filter(r => r.status === 'expiring_soon').length,
    nonCompliant: records.filter(r => r.status === 'non_compliant').length,
    pending: records.filter(r => r.status === 'pending_verification').length,
    total: records.length,
  };

  const teamStats = {
    compliant: teamRecords.filter(r => r.status === 'compliant').length,
    total: teamRecords.length,
    pending: teamRecords.filter(r => r.status === 'pending_verification').length,
    nonCompliant: teamRecords.filter(r => r.status === 'non_compliant' || r.status === 'not_started').length,
  };

  const orgStats = {
    compliant: allRecords.filter(r => r.status === 'compliant').length,
    total: allRecords.length,
    pending: allRecords.filter(r => r.status === 'pending_verification').length,
    nonCompliant: allRecords.filter(r => r.status === 'non_compliant' || r.status === 'not_started').length,
    expiring: allRecords.filter(r => r.status === 'expiring_soon').length,
  };

  // Tabs available
  const availableTabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'employee', label: 'My Compliance', icon: ShieldCheck },
    ...(isManager ? [{ id: 'manager' as Tab, label: 'Team Compliance', icon: Users }] : []),
    ...(isLeadership ? [{ id: 'executive' as Tab, label: 'Organisational Risk', icon: TrendingUp }] : []),
    ...(!embedded && isAdmin ? [{ id: 'admin' as Tab, label: 'Admin Controls', icon: Settings }] : []),
  ];

  return (
    <div className="space-y-6">
      {/* Header — hidden when embedded in Training & Competence */}
      {!embedded && (
        <div>
          <div className="flex items-center gap-3 mb-1">
            <ShieldCheck className="w-7 h-7 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Compliance & Skills Hub</h1>
          </div>
          <p className="text-gray-500 ml-10">Track regulatory compliance and job-role competencies across your organisation</p>
          {currentRoleTitle && (
            <p className="text-sm text-blue-600 font-medium ml-10 mt-1">Your role profile: {currentRoleTitle}</p>
          )}
        </div>
      )}
      {embedded && currentRoleTitle && (
        <p className="text-sm text-blue-600 font-medium">Your role profile: {currentRoleTitle}</p>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200">
        {availableTabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 font-medium text-sm transition-colors ${
                activeTab === tab.id ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* EMPLOYEE VIEW */}
      {activeTab === 'employee' && (
        <div className="space-y-6">
          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Compliant" value={myStats.compliant} total={myStats.total} icon={CheckCircle2} color="green" />
            <StatCard label="Expiring Soon" value={myStats.expiring} total={myStats.total} icon={Clock} color="amber" />
            <StatCard label="Non-Compliant" value={myStats.nonCompliant} total={myStats.total} icon={XCircle} color="red" />
            <StatCard label="Pending Verification" value={myStats.pending} total={myStats.total} icon={Upload} color="blue" />
          </div>

          {/* Progress donut */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col sm:flex-row items-center gap-6">
            <ProgressDonut compliant={myStats.compliant} total={myStats.total} size={140} />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">My Compliance Score</h3>
              <p className="text-gray-500 text-sm mb-3">
                {myStats.compliant} of {myStats.total} items compliant. {myStats.expiring > 0 && `${myStats.expiring} expiring soon. `}
                {myStats.nonCompliant > 0 && `${myStats.nonCompliant} need attention.`}
              </p>
              <div className="flex flex-wrap gap-2">
                {items.filter(i => i.requirement_type === 'mandatory').length > 0 && (
                  <span className="text-xs bg-red-50 text-red-700 px-2.5 py-1 rounded-full border border-red-200">
                    {items.filter(i => i.requirement_type === 'mandatory').length} Mandatory items
                  </span>
                )}
                {items.filter(i => i.requirement_type === 'essential').length > 0 && (
                  <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200">
                    {items.filter(i => i.requirement_type === 'essential').length} Essential items
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Records list */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">My Compliance & Skills</h3>
            </div>
            {loading ? (
              <div className="p-12 text-center text-gray-500">Loading...</div>
            ) : records.length === 0 ? (
              <div className="p-12 text-center">
                <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No compliance items assigned to your role yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {records.map((record) => {
                  const item = items.find(i => i.id === record.compliance_item_id);
                  const isExpanded = expandedRow === record.id;
                  const reqBadge = record.requirement_type === 'mandatory'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : record.requirement_type === 'essential'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-gray-50 text-gray-600 border-gray-200';
                  return (
                    <div key={record.id}>
                      <div
                        className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => setExpandedRow(isExpanded ? null : record.id)}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${STATUS_CONFIG[record.status].dot}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-medium text-gray-900 truncate">{record.item_name}</h4>
                                <span className={`text-xs px-2 py-0.5 rounded-full border ${reqBadge} capitalize`}>
                                  {record.requirement_type}
                                </span>
                                {record.item_type === 'compliance' && (
                                  <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
                                    Compliance
                                  </span>
                                )}
                                {record.item_type === 'competency' && (
                                  <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full border border-teal-200">
                                    Competency
                                  </span>
                                )}
                              </div>
                              {record.regulatory_body && (
                                <p className="text-xs text-gray-500 mt-0.5">{record.regulatory_body}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <StatusBadge status={record.status} />
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 space-y-4">
                          {item?.description && (
                            <p className="text-sm text-gray-600">{item.description}</p>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Completion Date:</span>{' '}
                              <span className="font-medium text-gray-900">{record.completion_date || 'Not recorded'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Expiry Date:</span>{' '}
                              <span className="font-medium text-gray-900">{record.expiry_date || 'No expiry'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Manager Verified:</span>{' '}
                              <span className="font-medium text-gray-900">
                                {record.manager_verified ? `Yes (${new Date(record.manager_verified_at!).toLocaleDateString()})` : 'No'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Evidence:</span>{' '}
                              {record.evidence_file_name ? (
                                <span className="font-medium text-blue-600">{record.evidence_file_name}</span>
                              ) : (
                                <span className="text-gray-400">Not uploaded</span>
                              )}
                            </div>
                          </div>

                          {/* Self-assessment */}
                          {record.item_type === 'competency' && (
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-2">Self-Assessment Rating</p>
                              <div className="flex gap-2">
                                {[1, 2, 3, 4].map(rating => (
                                  <button
                                    key={rating}
                                    onClick={(e) => { e.stopPropagation(); handleSelfAssess(record.compliance_item_id, rating); }}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                                      record.self_assessment_rating === rating
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                                    }`}
                                  >
                                    {rating} - {RATING_LABELS[rating]}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Upload evidence */}
                          {record.evidence_required !== false && (
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-2">Upload Evidence</p>
                              <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                                uploadingFor === record.compliance_item_id
                                  ? 'bg-gray-100 text-gray-400'
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}>
                                <Upload className="w-4 h-4" />
                                {uploadingFor === record.compliance_item_id ? 'Uploading...' : (record.evidence_file_name ? 'Replace Evidence' : 'Upload Certificate')}
                                <input
                                  type="file"
                                  className="hidden"
                                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                  onChange={(e) => {
                                    if (e.target.files?.[0]) handleUploadEvidence(record.compliance_item_id, e.target.files[0]);
                                    e.target.value = '';
                                  }}
                                  disabled={uploadingFor === record.compliance_item_id}
                                />
                              </label>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MANAGER VIEW */}
      {activeTab === 'manager' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Team Compliant" value={teamStats.compliant} total={teamStats.total} icon={CheckCircle2} color="green" />
            <StatCard label="Pending Verification" value={teamStats.pending} total={teamStats.total} icon={Upload} color="blue" />
            <StatCard label="Non-Compliant" value={teamStats.nonCompliant} total={teamStats.total} icon={XCircle} color="red" />
            <StatCard label="Total Items" value={teamStats.total} icon={FileText} color="gray" />
          </div>

          {/* Filter bar */}
          <FilterBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filterType={filterType}
            setFilterType={setFilterType}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            filterDept={filterDept}
            setFilterDept={setFilterDept}
            departments={departments}
            onExport={() => exportCSV(filterRecords(teamRecords), 'team-compliance-report.csv')}
          />

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {filterRecords(teamRecords).length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No team compliance records found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Employee</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Compliance Item</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Completed</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Expires</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filterRecords(teamRecords).map(record => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 text-sm">{record.employee_name}</div>
                          <div className="text-xs text-gray-500">{record.job_title || record.department}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 text-sm">{record.item_name}</div>
                          {record.regulatory_body && <div className="text-xs text-gray-500">{record.regulatory_body}</div>}
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={record.status} /></td>
                        <td className="px-4 py-3 text-sm text-gray-600">{record.completion_date || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{record.expiry_date || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            {record.status === 'pending_verification' && !record.id.startsWith('gap-') && (
                              <>
                                <button
                                  onClick={() => handleVerify(record.id, true)}
                                  disabled={verifyingId === record.id}
                                  className="p-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                                  title="Approve"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleVerify(record.id, false)}
                                  disabled={verifyingId === record.id}
                                  className="p-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                                  title="Reject"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {(record.status === 'non_compliant' || record.status === 'expiring_soon' || record.status === 'not_started') && (
                              <button
                                onClick={() => handleSendReminder(record.id, record.profile_id, record.item_name || '')}
                                className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                                title="Send Reminder"
                              >
                                <Bell className="w-4 h-4" />
                              </button>
                            )}
                            {record.evidence_file_path && (
                              <a
                                href="#"
                                onClick={(e) => { e.preventDefault(); window.open(`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/compliance-evidence/${record.evidence_file_path}`); }}
                                className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                                title="View Evidence"
                              >
                                <FileText className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EXECUTIVE VIEW */}
      {activeTab === 'executive' && (
        <div className="space-y-6">
          {/* Top-level compliance score */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center justify-center">
              <h3 className="text-sm font-semibold text-gray-600 uppercase mb-3">Organisational Compliance</h3>
              <ProgressDonut compliant={orgStats.compliant} total={orgStats.total} size={160} />
              <p className="text-sm text-gray-500 mt-3 text-center">
                {orgStats.compliant} of {orgStats.total} items compliant across the organisation
              </p>
            </div>

            <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard label="Compliant" value={orgStats.compliant} total={orgStats.total} icon={CheckCircle2} color="green" />
              <StatCard label="Expiring Soon" value={orgStats.expiring} total={orgStats.total} icon={Clock} color="amber" />
              <StatCard label="Non-Compliant" value={orgStats.nonCompliant} total={orgStats.total} icon={XCircle} color="red" />
              <StatCard label="Pending Verification" value={orgStats.pending} total={orgStats.total} icon={Upload} color="blue" />
              <StatCard label="Mandatory Items" value={allRecords.filter(r => r.requirement_type === 'mandatory').length} icon={ShieldCheck} color="purple" />
              <StatCard label="Total Records" value={orgStats.total} icon={FileText} color="gray" />
            </div>
          </div>

          {/* Department breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Compliance by Department</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {departments.map(dept => {
                const deptRecords = allRecords.filter(r => r.department === dept);
                const deptCompliant = deptRecords.filter(r => r.status === 'compliant').length;
                const deptPct = deptRecords.length > 0 ? Math.round((deptCompliant / deptRecords.length) * 100) : 0;
                return (
                  <div key={dept} className="px-6 py-4 flex items-center gap-4">
                    <Building2 className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900 text-sm">{dept}</span>
                        <span className="text-sm text-gray-500">{deptCompliant}/{deptRecords.length} ({deptPct}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-700 ${deptPct >= 80 ? 'bg-green-500' : deptPct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${deptPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              {departments.length === 0 && (
                <div className="p-8 text-center text-gray-500">No department data available.</div>
              )}
            </div>
          </div>

          {/* Filter and export */}
          <FilterBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filterType={filterType}
            setFilterType={setFilterType}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            filterDept={filterDept}
            setFilterDept={setFilterDept}
            departments={departments}
            onExport={() => exportCSV(filterRecords(allRecords), 'organisational-compliance-audit-report.csv')}
          />

          {/* Full audit table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Department</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Compliance Item</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Expiry</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Verified</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filterRecords(allRecords).slice(0, 100).map(record => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{record.employee_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{record.department || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{record.item_name}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${record.item_type === 'compliance' ? 'bg-purple-50 text-purple-700' : 'bg-teal-50 text-teal-700'}`}>
                          {record.item_type}
                        </span>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={record.status} /></td>
                      <td className="px-4 py-3 text-sm text-gray-600">{record.expiry_date || '—'}</td>
                      <td className="px-4 py-3">
                        {record.manager_verified ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <span className="text-xs text-gray-400">No</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filterRecords(allRecords).length > 100 && (
              <div className="px-6 py-3 bg-gray-50 text-sm text-gray-500 text-center">
                Showing 100 of {filterRecords(allRecords).length} records. Export for full data.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADMIN VIEW */}
      {activeTab === 'admin' && isAdmin && (
        <AdminControls
          items={adminItems}
          jobFamilies={jobFamilies}
          onItemsChanged={fetchComplianceItems}
          showItemModal={showItemModal}
          setShowItemModal={setShowItemModal}
          editingItem={editingItem}
          setEditingItem={setEditingItem}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, total, icon: Icon, color }: { label: string; value: number; total?: number; icon: any; color: string }) {
  const colorMap: Record<string, string> = {
    green: 'bg-green-50 text-green-700 border-green-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    gray: 'bg-gray-50 text-gray-700 border-gray-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  };
  return (
    <div className={`rounded-xl border p-4 ${colorMap[color] || colorMap.gray}`}>
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-5 h-5" />
        <span className="text-2xl font-bold">{value}{total !== undefined && <span className="text-sm font-normal opacity-60">/{total}</span>}</span>
      </div>
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

function FilterBar({ searchQuery, setSearchQuery, filterType, setFilterType, filterStatus, setFilterStatus, filterDept, setFilterDept, departments, onExport }: any) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search employees or items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
        <option value="all">All Types</option>
        <option value="compliance">Compliance</option>
        <option value="competency">Competency</option>
      </select>
      <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
        <option value="all">All Statuses</option>
        <option value="compliant">Compliant</option>
        <option value="expiring_soon">Expiring Soon</option>
        <option value="non_compliant">Non-Compliant</option>
        <option value="pending_verification">Pending Verification</option>
        <option value="not_started">Not Started</option>
      </select>
      <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
        <option value="all">All Departments</option>
        {departments.map((d: string) => <option key={d} value={d}>{d}</option>)}
      </select>
      <button
        onClick={onExport}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        <Download className="w-4 h-4" />
        Export CSV
      </button>
    </div>
  );
}

function AdminControls({ items, jobFamilies, onItemsChanged, showItemModal, setShowItemModal, editingItem, setEditingItem }: any) {
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [roleReqs, setRoleReqs] = useState<any[]>([]);

  useEffect(() => {
    fetchRoleReqs();
  }, []);

  async function fetchRoleReqs() {
    try {
      const { data } = await supabase
        .from('compliance_role_requirements')
        .select(`
          id, compliance_item_id, job_family_id, requirement_type, is_active,
          item:compliance_items(name),
          role:job_families(title)
        `);
      if (data) setRoleReqs(data);
    } catch (error) {
      console.error('Error fetching role requirements:', error);
    }
  }

  async function handleBulkAssign() {
    if (!selectedItem || selectedRoles.length === 0) return;
    try {
      const inserts = selectedRoles.map(roleId => ({
        compliance_item_id: selectedItem,
        job_family_id: roleId,
        requirement_type: 'mandatory',
        is_active: true,
      }));
      const { error } = await supabase.from('compliance_role_requirements').upsert(inserts, { onConflict: 'compliance_item_id,job_family_id' });
      if (error) throw error;
      setShowBulkAssign(false);
      setSelectedItem('');
      setSelectedRoles([]);
      fetchRoleReqs();
    } catch (error) {
      console.error('Error assigning requirements:', error);
      alert('Failed to assign requirements');
    }
  }

  async function handleDeleteItem(id: string) {
    if (!confirm('Are you sure? This will delete the compliance item and all related records.')) return;
    try {
      await supabase.from('compliance_items').delete().eq('id', id);
      onItemsChanged();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    }
  }

  return (
    <div className="space-y-6">
      {/* Compliance items management */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Compliance Items</h3>
          <button
            onClick={() => { setEditingItem(null); setShowItemModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Requirement</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Regulatory Body</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Expiry</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item: ComplianceItem) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 text-sm">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${item.item_type === 'compliance' ? 'bg-purple-50 text-purple-700' : 'bg-teal-50 text-teal-700'}`}>
                      {item.item_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                      item.requirement_type === 'mandatory' ? 'bg-red-50 text-red-700' :
                      item.requirement_type === 'essential' ? 'bg-blue-50 text-blue-700' :
                      'bg-gray-50 text-gray-600'
                    }`}>
                      {item.requirement_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.regulatory_body || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.expiry_months ? `${item.expiry_months} months` : 'No expiry'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => { setEditingItem(item); setShowItemModal(true); }}
                        className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                        title="Edit"
                      >
                        <Award className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk assignment */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Role-Based Assignment Matrix</h3>
          <button
            onClick={() => setShowBulkAssign(!showBulkAssign)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Bulk Assign
          </button>
        </div>

        {showBulkAssign && (
          <div className="px-6 py-4 bg-blue-50 border-b border-blue-100 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Compliance Item</label>
              <select value={selectedItem} onChange={(e) => setSelectedItem(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">Select an item...</option>
                {items.map((item: ComplianceItem) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Job Roles</label>
              <div className="flex flex-wrap gap-2">
                {jobFamilies.map((jf: any) => (
                  <button
                    key={jf.id}
                    onClick={() => setSelectedRoles(prev => prev.includes(jf.id) ? prev.filter(r => r !== jf.id) : [...prev, jf.id])}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      selectedRoles.includes(jf.id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {jf.title}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleBulkAssign} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                Apply Assignment
              </button>
              <button onClick={() => setShowBulkAssign(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300">
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Compliance Item</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Job Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Requirement</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {roleReqs.map((rr: any) => (
                <tr key={rr.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{rr.item?.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{rr.role?.title}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                      rr.requirement_type === 'mandatory' ? 'bg-red-50 text-red-700' :
                      rr.requirement_type === 'essential' ? 'bg-blue-50 text-blue-700' :
                      'bg-gray-50 text-gray-600'
                    }`}>
                      {rr.requirement_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {rr.is_active ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-gray-400" />}
                  </td>
                </tr>
              ))}
              {roleReqs.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No role assignments yet. Use Bulk Assign to get started.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Item modal */}
      {showItemModal && (
        <ItemModal
          item={editingItem}
          onClose={() => { setShowItemModal(false); setEditingItem(null); }}
          onSaved={() => { setShowItemModal(false); setEditingItem(null); onItemsChanged(); }}
        />
      )}
    </div>
  );
}

function ItemModal({ item, onClose, onSaved }: { item: ComplianceItem | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: item?.name || '',
    description: item?.description || '',
    item_type: item?.item_type || 'compliance',
    requirement_type: item?.requirement_type || 'mandatory',
    regulatory_body: item?.regulatory_body || '',
    evidence_required: item?.evidence_required ?? true,
    expiry_months: item?.expiry_months?.toString() || '',
    renewal_cycle: item?.renewal_cycle || 'none',
    sort_order: item?.sort_order?.toString() || '0',
    is_active: item?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        item_type: form.item_type,
        requirement_type: form.requirement_type,
        regulatory_body: form.regulatory_body || null,
        evidence_required: form.evidence_required,
        expiry_months: form.expiry_months ? parseInt(form.expiry_months) : null,
        renewal_cycle: form.renewal_cycle,
        sort_order: parseInt(form.sort_order) || 0,
        is_active: form.is_active,
      };

      if (item) {
        await supabase.from('compliance_items').update(payload).eq('id', item.id);
      } else {
        await supabase.from('compliance_items').insert(payload);
      }
      onSaved();
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Failed to save item');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{item ? 'Edit Compliance Item' : 'New Compliance Item'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={form.item_type} onChange={(e) => setForm({ ...form, item_type: e.target.value as any })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="compliance">Compliance</option>
                <option value="competency">Competency</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Requirement Level</label>
              <select value={form.requirement_type} onChange={(e) => setForm({ ...form, requirement_type: e.target.value as any })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="mandatory">Mandatory (Legal/Regulatory)</option>
                <option value="essential">Essential (Role-Specific)</option>
                <option value="optional">Optional (Professional Development)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Regulatory Body</label>
            <input type="text" value={form.regulatory_body} onChange={(e) => setForm({ ...form, regulatory_body: e.target.value })} placeholder="e.g. Housing Ombudsman, Building Safety Act" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expiry (months)</label>
              <input type="number" value={form.expiry_months} onChange={(e) => setForm({ ...form, expiry_months: e.target.value })} placeholder="12 = annual, 24 = biannual, empty = no expiry" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Renewal Cycle</label>
              <select value={form.renewal_cycle} onChange={(e) => setForm({ ...form, renewal_cycle: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="none">None</option>
                <option value="annual">Annual</option>
                <option value="biannual">Biannual</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
              <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex items-center gap-4 pt-6">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.evidence_required} onChange={(e) => setForm({ ...form, evidence_required: e.target.checked })} className="w-4 h-4 rounded" />
                Evidence Required
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded" />
                Active
              </label>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">
              {saving ? 'Saving...' : (item ? 'Update' : 'Create')}
            </button>
            <button type="button" onClick={onClose} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
