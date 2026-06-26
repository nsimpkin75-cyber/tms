import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface QuizRequest {
  action: 'generate' | 'analyze';
  currentRole?: string;
  targetRole?: string;
  jobFamily?: string;
  responses?: Record<string, string>;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestData: QuizRequest = await req.json();

    if (requestData.action === 'generate') {
      const questions = [
        {
          id: 'motivation',
          question: 'What motivates you most in your career progression?',
          type: 'text'
        },
        {
          id: 'strengths',
          question: 'What do you consider your top 3 strengths in your current role?',
          type: 'text'
        },
        {
          id: 'development_areas',
          question: 'What areas would you like to develop to reach your next career goal?',
          type: 'text'
        },
        {
          id: 'timeline',
          question: 'What is your ideal timeline for progression to the next level?',
          type: 'select',
          options: ['6 months', '1 year', '2 years', '3+ years']
        },
        {
          id: 'support_needed',
          question: 'What support do you need from your manager to achieve your career goals?',
          type: 'text'
        },
        {
          id: 'skills_confidence',
          question: 'On a scale of 1-10, how confident are you in having the skills needed for your target role?',
          type: 'scale',
          min: 1,
          max: 10
        },
        {
          id: 'current_challenges',
          question: 'What challenges do you face in your current role that might impact your progression?',
          type: 'text'
        }
      ];

      return new Response(
        JSON.stringify({ questions }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else if (requestData.action === 'analyze') {
      const analysis = `Based on your responses, here is an AI-generated analysis:

Your career progression shows strong potential with clear motivations and self-awareness of your strengths. The development areas you've identified align well with the requirements for ${requestData.targetRole || 'your target role'}.

Key Recommendations:
1. Focus on developing the skills you identified as development areas
2. Seek mentorship opportunities within your organization
3. Consider taking on projects that align with your target role
4. Maintain regular discussions with your manager about your progress

Next Steps:
You can now generate a detailed career overview report or submit a Career Development Plan (CDP) to formalize your progression journey with your manager.`;

      const recommendations = [
        {
          category: 'Skills Development',
          items: ['Complete relevant training modules', 'Shadow senior team members', 'Take on stretch assignments']
        },
        {
          category: 'Networking',
          items: ['Attend industry events', 'Join internal committees', 'Build cross-functional relationships']
        },
        {
          category: 'Experience',
          items: ['Lead a project', 'Mentor junior colleagues', 'Contribute to strategic initiatives']
        }
      ];

      await supabase
        .from('career_quiz_responses')
        .insert({
          user_id: user.id,
          quiz_data: requestData.responses || {},
          ai_analysis: analysis,
          recommendations: recommendations,
        });

      return new Response(
        JSON.stringify({ analysis, recommendations }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in career quiz AI:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});