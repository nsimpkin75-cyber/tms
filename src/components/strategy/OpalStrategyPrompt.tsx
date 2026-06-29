import { useState } from 'react';
import { Sparkles, X, ChevronRight, Loader2, CreditCard as Edit3, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface DeptPlan {
  id: string;
  title: string;
  department_name: string;
}

interface TemplateSection {
  title: string;
  questions: string[];
}

interface Props {
  plan: DeptPlan;
  strategyTitle: string;
  onClose: () => void;
  onPublished: () => void;
}

export default function OpalStrategyPrompt({ plan, strategyTitle, onClose, onPublished }: Props) {
  const { profile } = useAuth();
  const [step, setStep] = useState<'prompt' | 'generating' | 'review' | 'published'>('prompt');
  const [template, setTemplate] = useState<TemplateSection[]>([]);
  const [templateName, setTemplateName] = useState(`${plan.department_name} — Strategic Review Template`);
  const [publishing, setPublishing] = useState(false);

  async function generateTemplate() {
    setStep('generating');
    // Fetch objectives and KPIs from the plan
    const [objRes, kpiRes] = await Promise.all([
      supabase.from('dept_plan_objectives').select('title, description').eq('plan_id', plan.id),
      supabase.from('dept_plan_kpis').select('title, target_value, measurement_unit').eq('plan_id', plan.id),
    ]);
    const objectives = objRes.data ?? [];
    const kpis = kpiRes.data ?? [];

    // Build template sections based on actual plan data
    const sections: TemplateSection[] = [
      {
        title: 'Strategic Progress',
        questions: [
          `How are you progressing against the ${strategyTitle} strategy?`,
          'What have been your key achievements this period?',
          'Are there any blockers preventing progress?',
        ],
      },
    ];

    if (objectives.length > 0) {
      sections.push({
        title: 'Objectives Review',
        questions: objectives.map(o => `Progress on objective: ${o.title}`),
      });
    }

    if (kpis.length > 0) {
      sections.push({
        title: 'KPI Performance',
        questions: kpis.map(k =>
          k.target_value
            ? `${k.title} — current vs target of ${k.target_value}${k.measurement_unit ? ' ' + k.measurement_unit : ''}`
            : `Update on KPI: ${k.title}`
        ),
      });
    }

    sections.push(
      {
        title: 'Support & Resources',
        questions: [
          'What support do you need to meet your objectives?',
          'Are resource requirements being met?',
          'Any risks or concerns to escalate?',
        ],
      },
      {
        title: 'Next Steps',
        questions: [
          'What are your priorities for the next period?',
          'Any development conversations to capture?',
          'Actions agreed this session:',
        ],
      }
    );

    setTemplate(sections);
    setStep('review');
  }

  async function publishTemplate() {
    if (!profile) return;
    setPublishing(true);
    const templateData = {
      name: templateName,
      description: `Auto-generated from approved strategy: ${strategyTitle} — ${plan.department_name}`,
      sections: template.map((s, i) => ({
        title: s.title,
        sort_order: i,
        questions: s.questions.map((q, j) => ({ text: q, sort_order: j, type: 'text' })),
      })),
      is_default: false,
      created_by: profile.id,
      strategy_plan_id: plan.id,
    };

    await supabase.from('review_form_templates').insert([templateData]).maybeSingle();
    setPublishing(false);
    setStep('published');
  }

  function updateQuestion(sectionIdx: number, qIdx: number, value: string) {
    setTemplate(prev => {
      const next = prev.map((s, si) => si !== sectionIdx ? s : {
        ...s,
        questions: s.questions.map((q, qi) => qi !== qIdx ? q : value),
      });
      return next;
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-gradient-to-r from-cyan-700 to-teal-700 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-white font-semibold">Opal — AI Growth Guide</h2>
                <p className="text-cyan-200 text-xs">Strategy Review Template Generator</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'prompt' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-cyan-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-cyan-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Your strategy has been approved!</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-6">
                The <strong>{plan.department_name}</strong> Department Strategic Plan has been approved.<br /><br />
                Would you like me to create a One-to-One Review Template based on your approved strategy,
                objectives and KPIs? I'll analyse the plan and generate a recommended template
                that you can edit before publishing.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={generateTemplate}
                  className="flex items-center gap-2 px-6 py-2.5 bg-cyan-600 text-white rounded-xl font-medium hover:bg-cyan-700 transition-colors"
                >
                  <Sparkles className="w-4 h-4" /> Yes, create a template
                </button>
                <button onClick={onClose} className="px-6 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors">
                  Not right now
                </button>
              </div>
            </div>
          )}

          {step === 'generating' && (
            <div className="text-center py-12">
              <Loader2 className="w-10 h-10 text-cyan-600 animate-spin mx-auto mb-4" />
              <p className="font-medium text-slate-800">Opal is analysing your strategy...</p>
              <p className="text-sm text-slate-500 mt-1">Building a recommended review template</p>
            </div>
          )}

          {step === 'review' && (
            <div>
              <p className="text-sm text-slate-600 mb-4">
                Here's the template Opal has generated based on your approved strategy. Edit any questions before publishing.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Template Name</label>
                <input
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
              <div className="space-y-4">
                {template.map((section, si) => (
                  <div key={si} className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2.5 flex items-center gap-2">
                      <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-sm font-semibold text-slate-700">{section.title}</span>
                    </div>
                    <div className="p-4 space-y-2">
                      {section.questions.map((q, qi) => (
                        <input
                          key={qi}
                          value={q}
                          onChange={e => updateQuestion(si, qi, e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={publishTemplate}
                  disabled={publishing}
                  className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 text-white rounded-xl font-medium hover:bg-cyan-700 disabled:opacity-50 transition-colors"
                >
                  {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                  Publish Template
                </button>
                <button onClick={onClose} className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors">
                  Save for Later
                </button>
              </div>
            </div>
          )}

          {step === 'published' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Template Published!</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-6">
                <strong>{templateName}</strong> has been saved and is available in Review Templates.
                You can set it as the default template for your team from the Admin panel.
              </p>
              <button
                onClick={() => { onPublished(); onClose(); }}
                className="px-6 py-2.5 bg-cyan-600 text-white rounded-xl font-medium hover:bg-cyan-700 transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
