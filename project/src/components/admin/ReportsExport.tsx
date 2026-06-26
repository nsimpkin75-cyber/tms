import React, { useState } from 'react';
import { Download, FileText, Users, GraduationCap, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

export default function ReportsExport() {
  const [loading, setLoading] = useState(false);

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            if (value === null || value === undefined) return '';
            if (typeof value === 'object') return JSON.stringify(value).replace(/,/g, ';');
            return `"${String(value).replace(/"/g, '""')}"`;
          })
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('email, full_name, role, department, tenure, created_at');

      if (error) throw error;
      exportToCSV(data, 'users_report');
    } catch (error) {
      console.error('Error exporting users:', error);
      alert('Failed to export users');
    } finally {
      setLoading(false);
    }
  };

  const exportTrainingSessions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('training_sessions')
        .select('title, type, date, time, trainer_name, method, max_attendees, description');

      if (error) throw error;
      exportToCSV(data, 'training_sessions_report');
    } catch (error) {
      console.error('Error exporting training sessions:', error);
      alert('Failed to export training sessions');
    } finally {
      setLoading(false);
    }
  };

  const exportTrainingCompletions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('training_completions')
        .select(`
          completed_at,
          score,
          user:profiles(full_name, email),
          course:training_courses(title, category, duration_minutes)
        `);

      if (error) throw error;

      const formattedData = data.map((item: any) => ({
        user_name: item.user?.full_name,
        user_email: item.user?.email,
        course_title: item.course?.title,
        course_category: item.course?.category,
        duration_minutes: item.course?.duration_minutes,
        completed_at: item.completed_at,
        score: item.score,
      }));

      exportToCSV(formattedData, 'training_completions_report');
    } catch (error) {
      console.error('Error exporting training completions:', error);
      alert('Failed to export training completions');
    } finally {
      setLoading(false);
    }
  };

  const exportCareerPathways = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('career_pathways')
        .select(`
          from_role,
          to_role,
          progress,
          created_at,
          user:profiles(full_name, email, department)
        `);

      if (error) throw error;

      const formattedData = data.map((item: any) => ({
        user_name: item.user?.full_name,
        user_email: item.user?.email,
        department: item.user?.department,
        from_role: item.from_role,
        to_role: item.to_role,
        progress: item.progress,
        created_at: item.created_at,
      }));

      exportToCSV(formattedData, 'career_pathways_report');
    } catch (error) {
      console.error('Error exporting career pathways:', error);
      alert('Failed to export career pathways');
    } finally {
      setLoading(false);
    }
  };

  const exportReviews = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          rating,
          feedback,
          review_date,
          user:user_id(full_name, email),
          reviewer:reviewer_id(full_name, email)
        `);

      if (error) throw error;

      const formattedData = data.map((item: any) => ({
        employee_name: item.user?.full_name,
        employee_email: item.user?.email,
        reviewer_name: item.reviewer?.full_name,
        reviewer_email: item.reviewer?.email,
        rating: item.rating,
        feedback: item.feedback,
        review_date: item.review_date,
      }));

      exportToCSV(formattedData, 'reviews_report');
    } catch (error) {
      console.error('Error exporting reviews:', error);
      alert('Failed to export reviews');
    } finally {
      setLoading(false);
    }
  };

  const exportSkills = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('skills')
        .select('name, category, created_at');

      if (error) throw error;
      exportToCSV(data, 'skills_report');
    } catch (error) {
      console.error('Error exporting skills:', error);
      alert('Failed to export skills');
    } finally {
      setLoading(false);
    }
  };

  const exportJobFamilies = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('job_families')
        .select('title, department, level, description, required_skills');

      if (error) throw error;

      const formattedData = data.map((item) => ({
        ...item,
        required_skills: item.required_skills.join('; '),
      }));

      exportToCSV(formattedData, 'job_families_report');
    } catch (error) {
      console.error('Error exporting job families:', error);
      alert('Failed to export job families');
    } finally {
      setLoading(false);
    }
  };

  const reports = [
    {
      title: 'Users Report',
      description: 'Export all user profiles including role, department, and tenure',
      icon: Users,
      action: exportUsers,
      color: 'blue',
    },
    {
      title: 'Training Sessions',
      description: 'Export all scheduled training sessions with trainer details',
      icon: GraduationCap,
      action: exportTrainingSessions,
      color: 'green',
    },
    {
      title: 'Training Completions',
      description: 'Export training completion records with scores',
      icon: FileText,
      action: exportTrainingCompletions,
      color: 'yellow',
    },
    {
      title: 'Career Pathways',
      description: 'Export career progression data for all users',
      icon: TrendingUp,
      action: exportCareerPathways,
      color: 'purple',
    },
    {
      title: 'Performance Reviews',
      description: 'Export performance review data with ratings and feedback',
      icon: FileText,
      action: exportReviews,
      color: 'red',
    },
    {
      title: 'Skills Database',
      description: 'Export all skills organized by category',
      icon: FileText,
      action: exportSkills,
      color: 'teal',
    },
    {
      title: 'Job Families',
      description: 'Export job families with required skills and levels',
      icon: FileText,
      action: exportJobFamilies,
      color: 'orange',
    },
  ];

  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
    teal: 'bg-teal-50 text-teal-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Export Reports</h2>
        <p className="text-gray-600">Generate and download CSV reports for various data types</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <div
              key={report.title}
              className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${colorClasses[report.color as keyof typeof colorClasses]}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{report.title}</h3>
                  <p className="text-sm text-gray-600 mb-4">{report.description}</p>
                  <button
                    onClick={report.action}
                    disabled={loading}
                    className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4" />
                    {loading ? 'Exporting...' : 'Export CSV'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
