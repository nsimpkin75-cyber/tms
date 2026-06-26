import React, { useState, useEffect } from 'react';
import { Award, Info, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Competency {
  id: string;
  value_id: string;
  title: string;
  description: string | null;
  emoji: string | null;
  competency_statement: string | null;
  employee_evidence_prompt: string | null;
  employee_what_good_looks_like: string | null;
  employee_what_great_looks_like: string | null;
  manager_evidence_prompt: string | null;
  manager_what_good_looks_like: string | null;
  manager_what_great_looks_like: string | null;
  senior_leader_evidence_prompt: string | null;
  senior_leader_what_good_looks_like: string | null;
  senior_leader_what_great_looks_like: string | null;
}

interface Value {
  id: string;
  title: string;
  statement: string;
  emoji: string | null;
  usage_description: string | null;
  competencies: Competency[];
}

const LEVELS = [
  {
    key: 'employee',
    label: 'Employee',
    color: 'blue',
    bgClass: 'bg-blue-50 border-blue-200',
    headerClass: 'text-blue-900',
    subClass: 'text-blue-700',
    badgeClass: 'bg-blue-100 text-blue-800',
    goodBg: 'bg-blue-50 border-blue-200 text-blue-800',
    greatBg: 'bg-blue-100 border-blue-300 text-blue-900',
  },
  {
    key: 'manager',
    label: 'Manager',
    color: 'teal',
    bgClass: 'bg-teal-50 border-teal-200',
    headerClass: 'text-teal-900',
    subClass: 'text-teal-700',
    badgeClass: 'bg-teal-100 text-teal-800',
    goodBg: 'bg-teal-50 border-teal-200 text-teal-800',
    greatBg: 'bg-teal-100 border-teal-300 text-teal-900',
  },
  {
    key: 'senior_leader',
    label: 'Senior Leader',
    color: 'slate',
    bgClass: 'bg-slate-50 border-slate-200',
    headerClass: 'text-slate-900',
    subClass: 'text-slate-700',
    badgeClass: 'bg-slate-200 text-slate-800',
    goodBg: 'bg-slate-50 border-slate-200 text-slate-800',
    greatBg: 'bg-slate-100 border-slate-300 text-slate-900',
  },
];

export default function CompetencyFramework() {
  const { effectiveProfile } = useAuth();
  const [values, setValues] = useState<Value[]>([]);
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const [selectedCompetency, setSelectedCompetency] = useState<Competency | null>(null);
  const [loading, setLoading] = useState(true);
  const [frameworkDescription, setFrameworkDescription] = useState('');

  const userCompetencyLevel = effectiveProfile?.competency_level || 'Employee';

  useEffect(() => {
    fetchCompetencyFramework();
    fetchFrameworkDescription();
  }, []);

  const fetchFrameworkDescription = async () => {
    try {
      const { data } = await supabase
        .from('competency_frameworks')
        .select('description')
        .maybeSingle();
      if (data) setFrameworkDescription(data.description || '');
    } catch (error) {
      console.error('Error fetching framework description:', error);
    }
  };

  const fetchCompetencyFramework = async () => {
    try {
      setLoading(true);

      const { data: valuesData, error: valuesError } = await supabase
        .from('values')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (valuesError) throw valuesError;

      const valuesWithCompetencies = await Promise.all(
        (valuesData || []).map(async (value) => {
          const { data: competenciesData } = await supabase
            .from('competencies')
            .select(`
              id, value_id, title, description, emoji,
              competency_statement,
              employee_evidence_prompt, employee_what_good_looks_like, employee_what_great_looks_like,
              manager_evidence_prompt, manager_what_good_looks_like, manager_what_great_looks_like,
              senior_leader_evidence_prompt, senior_leader_what_good_looks_like, senior_leader_what_great_looks_like
            `)
            .eq('value_id', value.id)
            .eq('is_active', true)
            .order('sort_order');

          return {
            ...value,
            competencies: competenciesData || [],
          };
        })
      );

      setValues(valuesWithCompetencies);

      if (valuesWithCompetencies.length > 0) {
        setSelectedValue(valuesWithCompetencies[0].id);
      }
    } catch (error) {
      console.error('Error fetching competency framework:', error);
    } finally {
      setLoading(false);
    }
  };

  function getLevelFields(competency: Competency, levelKey: string) {
    if (levelKey === 'manager') {
      return {
        evidence_prompt: competency.manager_evidence_prompt,
        what_good_looks_like: competency.manager_what_good_looks_like,
        what_great_looks_like: competency.manager_what_great_looks_like,
      };
    }
    if (levelKey === 'senior_leader') {
      return {
        evidence_prompt: competency.senior_leader_evidence_prompt,
        what_good_looks_like: competency.senior_leader_what_good_looks_like,
        what_great_looks_like: competency.senior_leader_what_great_looks_like,
      };
    }
    return {
      evidence_prompt: competency.employee_evidence_prompt,
      what_good_looks_like: competency.employee_what_good_looks_like,
      what_great_looks_like: competency.employee_what_great_looks_like,
    };
  }

  function hasLevelContent(competency: Competency, levelKey: string) {
    const fields = getLevelFields(competency, levelKey);
    return !!(fields.evidence_prompt || fields.what_good_looks_like || fields.what_great_looks_like);
  }

  function getUserLevelKey() {
    if (userCompetencyLevel === 'Manager') return 'manager';
    if (userCompetencyLevel === 'Senior Leader') return 'senior_leader';
    return 'employee';
  }

  const currentValue = values.find(v => v.id === selectedValue);

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (values.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Award className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Competency Framework Yet</h3>
          <p className="text-gray-600">
            The competency framework is currently being developed. Check back soon!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Competency Framework</h1>
        <p className="text-gray-600 mt-2">
          Our organizational values and the competencies that bring them to life
        </p>
        {frameworkDescription && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">{frameworkDescription}</p>
            </div>
          </div>
        )}
        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-sm text-gray-600">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
          Viewing as: <span className="font-semibold text-gray-800">{userCompetencyLevel}</span>
        </div>
      </div>

      <div className="mb-6 border-b border-gray-200 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {values.map((value) => (
            <button
              key={value.id}
              onClick={() => setSelectedValue(value.id)}
              className={`px-6 py-4 font-medium whitespace-nowrap transition-all ${
                selectedValue === value.id
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                {value.emoji && <span className="text-2xl">{value.emoji}</span>}
                <span>{value.title}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {currentValue && (
        <div className="space-y-6">
          {(currentValue.statement || currentValue.usage_description) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">{currentValue.title}</h3>
                  <p className="text-sm text-blue-800 mb-2">{currentValue.statement}</p>
                  {currentValue.usage_description && (
                    <p className="text-sm text-blue-700">{currentValue.usage_description}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-8">
            {currentValue.competencies.map((competency) => {
              const userLevelKey = getUserLevelKey();
              const userLevelConfig = LEVELS.find(l => l.key === userLevelKey)!;
              const userLevelFields = getLevelFields(competency, userLevelKey);

              return (
                <div key={competency.id} className="bg-white rounded-lg border-2 border-gray-200 shadow-sm">
                  <div
                    className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setSelectedCompetency(selectedCompetency?.id === competency.id ? null : competency)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {competency.emoji && <span className="text-3xl">{competency.emoji}</span>}
                        <div>
                          <h2 className="text-xl font-bold text-gray-900">{competency.title}</h2>
                          {competency.description && (
                            <p className="text-gray-600 mt-1 text-sm">{competency.description}</p>
                          )}
                        </div>
                      </div>
                      <ChevronRight
                        className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 mt-1 ${
                          selectedCompetency?.id === competency.id ? 'rotate-90' : ''
                        }`}
                      />
                    </div>

                    {competency.competency_statement && (
                      <p className="mt-3 text-gray-700 text-sm leading-relaxed bg-gray-50 rounded-lg p-3">
                        {competency.competency_statement}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {LEVELS.map((level) => (
                        hasLevelContent(competency, level.key) && (
                          <span
                            key={level.key}
                            className={`text-xs px-2 py-1 rounded-full font-medium ${level.badgeClass}`}
                          >
                            {level.label}
                          </span>
                        )
                      ))}
                    </div>
                  </div>

                  {selectedCompetency?.id === competency.id && (
                    <div className="border-t border-gray-200 p-6 space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-sm font-semibold px-3 py-1 rounded-full ${userLevelConfig.badgeClass}`}>
                          Your Level: {userCompetencyLevel}
                        </span>
                      </div>

                      {userLevelFields.evidence_prompt ? (
                        <div className={`rounded-lg border p-4 ${userLevelConfig.bgClass}`}>
                          <h4 className={`font-semibold text-sm mb-2 ${userLevelConfig.headerClass}`}>
                            Evidence Prompt
                          </h4>
                          <p className={`text-sm leading-relaxed ${userLevelConfig.subClass}`}>
                            {userLevelFields.evidence_prompt}
                          </p>
                        </div>
                      ) : null}

                      <div className="grid md:grid-cols-2 gap-4">
                        {userLevelFields.what_good_looks_like && (
                          <div className={`rounded-lg border p-4 ${userLevelConfig.goodBg}`}>
                            <h4 className="font-semibold text-sm mb-2">What Good Looks Like</h4>
                            <p className="text-sm leading-relaxed">{userLevelFields.what_good_looks_like}</p>
                          </div>
                        )}
                        {userLevelFields.what_great_looks_like && (
                          <div className={`rounded-lg border p-4 ${userLevelConfig.greatBg}`}>
                            <h4 className="font-semibold text-sm mb-2">What Great Looks Like</h4>
                            <p className="text-sm leading-relaxed">{userLevelFields.what_great_looks_like}</p>
                          </div>
                        )}
                      </div>

                      {!userLevelFields.evidence_prompt && !userLevelFields.what_good_looks_like && !userLevelFields.what_great_looks_like && (
                        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 text-center">
                          <p className="text-sm text-gray-500">
                            No detailed guidance available for {userCompetencyLevel} level yet.
                          </p>
                        </div>
                      )}

                      {['manager', 'leadership', 'admin'].includes(effectiveProfile?.role || '') && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h4 className="font-semibold text-sm text-gray-700 mb-3">All Level Guidance</h4>
                          <div className="space-y-3">
                            {LEVELS.map((level) => {
                              const fields = getLevelFields(competency, level.key);
                              if (!fields.evidence_prompt && !fields.what_good_looks_like && !fields.what_great_looks_like) return null;
                              return (
                                <div key={level.key} className={`rounded-lg border p-3 ${level.bgClass}`}>
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${level.badgeClass} mb-2 inline-block`}>
                                    {level.label}
                                  </span>
                                  {fields.evidence_prompt && (
                                    <p className={`text-xs mt-1 ${level.subClass}`}>
                                      <span className="font-semibold">Evidence: </span>{fields.evidence_prompt}
                                    </p>
                                  )}
                                  {fields.what_good_looks_like && (
                                    <p className={`text-xs mt-1 ${level.subClass}`}>
                                      <span className="font-semibold">Good: </span>{fields.what_good_looks_like}
                                    </p>
                                  )}
                                  {fields.what_great_looks_like && (
                                    <p className={`text-xs mt-1 ${level.subClass}`}>
                                      <span className="font-semibold">Great: </span>{fields.what_great_looks_like}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {currentValue.competencies.length === 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <p className="text-gray-500">No competencies defined for this value yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
