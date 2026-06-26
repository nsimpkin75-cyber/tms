import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ReportRequest {
  quizResponseId: string;
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

    const requestData: ReportRequest = await req.json();

    const { data: quizResponse, error: quizError } = await supabase
      .from('career_quiz_responses')
      .select('*')
      .eq('id', requestData.quizResponseId)
      .eq('user_id', user.id)
      .single();

    if (quizError || !quizResponse) {
      return new Response(
        JSON.stringify({ error: 'Quiz response not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role, department, job_family_id')
      .eq('id', user.id)
      .single();

    const report = {
      title: 'Career Development Overview Report',
      generatedDate: new Date().toISOString(),
      employee: {
        name: profile?.full_name || 'Unknown',
        currentRole: profile?.role || 'Unknown',
        department: profile?.department || 'Unknown'
      },
      summary: quizResponse.ai_analysis,
      recommendations: quizResponse.recommendations,
      nextSteps: [
        'Review this report with your manager in your next one-to-one',
        'Identify specific training opportunities from the recommendations',
        'Consider submitting a Career Development Plan to formalize your progression',
        'Set measurable goals with clear timelines',
        'Schedule regular check-ins to track your progress'
      ],
      assessment: {
        strengths: quizResponse.quiz_data?.strengths || '',
        developmentAreas: quizResponse.quiz_data?.development_areas || '',
        motivation: quizResponse.quiz_data?.motivation || '',
        timeline: quizResponse.quiz_data?.timeline || '',
        confidence: quizResponse.quiz_data?.skills_confidence || ''
      }
    };

    return new Response(
      JSON.stringify({ report }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error generating career report:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});