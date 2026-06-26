import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole =
  | 'employee'
  | 'manager'
  | 'dept_lead'
  | 'senior'
  | 'leadership'
  | 'l_and_d'
  | 'admin';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  admin_type?: 'full_admin' | 'job_families_admin' | 'people_admin' | null;
  avatar_url?: string;
  department?: string;
  tenure: number;
  has_strategic_roadmap_access?: boolean;
  manager_id?: string;
  job_family_id?: string;
  competency_level?: 'Employee' | 'Manager' | 'Senior Leader';
  created_at: string;
}

export interface Review {
  id: string;
  employee_id: string;
  manager_id: string;
  type: 'weekly' | 'monthly' | 'project';
  status: 'draft' | 'submitted' | 'completed';
  overall_rating?: number;
  summary?: string;
  created_at: string;
}

export interface ReviewItem {
  id: string;
  review_id: string;
  category: 'Wins' | 'Blockers' | 'KPI' | 'Values';
  content: string;
  rating?: number;
  created_at: string;
}

export interface ActionItem {
  id: string;
  owner_id: string;
  text: string;
  due_date?: string;
  completed: boolean;
  is_carry_over: boolean;
  created_at: string;
}

export interface TrainingSession {
  id: string;
  title: string;
  type: 'Upskill' | 'Soft Skill' | 'Pathway';
  date: string;
  time: string;
  trainer_name: string;
  method: 'Remote' | 'Classroom';
  max_attendees: number;
  description?: string;
  created_at: string;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  created_at: string;
}

export interface JobFamily {
  id: string;
  title: string;
  department: string;
  level: 'Entry' | 'Mid' | 'Senior' | 'Lead' | 'Principal';
  description?: string;
  required_skills: string[];
  created_at: string;
}
