import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CoachRequest {
  userMessage: string;
  sessionId?: string;
  context: {
    employeeName: string;
    currentRole: string;
    department: string;
    team: string | null;
    lengthOfService: string;
    performanceAvg: number | null;
    matchedPathway: {
      id: string;
      title: string;
      level: string;
      description: string | null;
      accountabilities: string[];
      whatGreatLooksLike: string[];
      skills: string[];
      howDoIGetThere: string | null;
      progressionTo: string | null;
      alternativePaths: string[];
    } | null;
    nextPathway: {
      title: string;
      level: string;
      howDoIGetThere: string | null;
      accountabilities: string[];
      skills: string[];
    } | null;
    assessedSkills: string[];
    careerGoals: string | null;
    profileRoleSummary?: string | null;
    profileRoleHistory?: Array<{ role_title: string; department: string; start_date?: string; end_date?: string; is_current?: boolean; summary?: string; achievements?: string }>;
    profileAdditionalSkills?: Array<{ skill_name: string; category?: string; confidence_level?: string; evidence?: string }>;
    profileQualifications?: Array<{ name: string; provider?: string; date_completed?: string; expiry_date?: string }>;
    seraCoachingContext?: string | null;
    previousMessages: Array<{ role: string; content: string }>;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
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

    const body: CoachRequest = await req.json();
    const { userMessage, context } = body;

    const {
      employeeName, currentRole, department, team, lengthOfService,
      performanceAvg, matchedPathway, nextPathway, assessedSkills,
      careerGoals, profileRoleSummary, profileRoleHistory, profileAdditionalSkills,
      profileQualifications, seraCoachingContext, previousMessages
    } = context;

    // Build rich system prompt with all available pathway data
    const pathwayBlock = matchedPathway ? `
CURRENT ROLE PROFILE (matched from Pathways):
- Title: ${matchedPathway.title}
- Level: ${matchedPathway.level}
- Description: ${matchedPathway.description || 'Not specified'}
- Key Accountabilities: ${matchedPathway.accountabilities.slice(0, 5).join('; ') || 'Not specified'}
- What Great Looks Like: ${matchedPathway.whatGreatLooksLike.slice(0, 3).join('; ') || 'Not specified'}
- Required Skills: ${matchedPathway.skills.join(', ') || 'Not specified'}
- How to Progress From This Role: ${matchedPathway.howDoIGetThere || 'Not specified'}
- Progression To: ${matchedPathway.progressionTo || 'Not specified'}
- Alternative Paths: ${matchedPathway.alternativePaths.join(', ') || 'None listed'}` : 'No matched role profile found for this employee.';

    const nextPathwayBlock = nextPathway ? `
NEXT ROLE PROFILE (progression target):
- Title: ${nextPathway.title}
- Level: ${nextPathway.level}
- How to Get There: ${nextPathway.howDoIGetThere || 'Not specified'}
- Accountabilities at Next Level: ${nextPathway.accountabilities.slice(0, 4).join('; ') || 'Not specified'}
- Skills Required at Next Level: ${nextPathway.skills.join(', ') || 'Not specified'}` : '';

    const perfBlock = performanceAvg !== null
      ? `Performance average (completed reviews): ${performanceAvg.toFixed(2)}/5`
      : 'Performance average: No completed reviews yet';

    // Build My Profile CV blocks for SERA context
    const roleSummaryBlock = profileRoleSummary
      ? `\n- Role Purpose (self-described): ${profileRoleSummary}` : '';

    const roleHistoryBlock = profileRoleHistory && profileRoleHistory.length > 0
      ? `\nROLE HISTORY (from My Profile):\n${profileRoleHistory.map(r =>
          `- ${r.role_title} | ${r.department} | ${r.start_date || '?'} – ${r.is_current ? 'Present' : (r.end_date || '?')}${r.summary ? ': ' + r.summary : ''}`
        ).join('\n')}` : '';

    const additionalSkillsBlock = profileAdditionalSkills && profileAdditionalSkills.length > 0
      ? `\nADDITIONAL SKILLS (self-reported in My Profile):\n${profileAdditionalSkills.map(s =>
          `- ${s.skill_name}${s.category ? ' (' + s.category + ')' : ''}${s.confidence_level ? ' — ' + s.confidence_level : ''}${s.evidence ? ': ' + s.evidence : ''}`
        ).join('\n')}` : '';

    const qualificationsBlock = profileQualifications && profileQualifications.length > 0
      ? `\nQUALIFICATIONS & TRAINING (from My Profile):\n${profileQualifications.map(q =>
          `- ${q.name}${q.provider ? ' | ' + q.provider : ''}${q.date_completed ? ' | ' + q.date_completed : ''}${q.expiry_date ? ' | Expires ' + q.expiry_date : ''}`
        ).join('\n')}` : '';

    const seraCoachingBlock = seraCoachingContext
      ? `\nINTERNAL COACHING CONTEXT FOR THIS ROLE (not shared with employee — use to inform your coaching approach):\n${seraCoachingContext}`
      : '';

    const systemPrompt = `You are SERA, an AI Career Coach embedded in a talent management platform. You give specific, data-driven career guidance grounded in the organisation's actual role profiles and pathways.

EMPLOYEE PROFILE:
- Name: ${employeeName}
- Current Role: ${currentRole}${roleSummaryBlock}
- Department: ${department}${team ? ` · Team: ${team}` : ''}
- Length of Service: ${lengthOfService}
- ${perfBlock}
- Assessed Skills: ${assessedSkills.length > 0 ? assessedSkills.join(', ') : 'None on record'}
- Career Goals: ${careerGoals || 'Not stated'}
${roleHistoryBlock}${additionalSkillsBlock}${qualificationsBlock}

${pathwayBlock}
${nextPathwayBlock}
${seraCoachingBlock}

COACHING INSTRUCTIONS:
1. Always ground your responses in the actual pathway and role profile data above.
2. When discussing progression, reference the specific "How to Get There" guidance, required skills, and accountabilities from the matched pathways.
3. Be specific about readiness gaps — compare what the employee has vs what the next role requires.
4. Suggest concrete actions, not generic advice. Reference actual skills and accountabilities.
5. If the employee asks about a next role, name it specifically from the pathway data.
6. Keep responses concise and actionable — 3-5 sentences or a short structured list.
7. Do NOT give generic HR advice unrelated to the data. If data is missing, say so and suggest how to fill the gap.
8. You are NOT involved in review scoring, moderation, or competency ratings. Your role is purely career coaching.
9. Use the internal coaching context (if provided) to shape your tone, approach, and emphasis — but never quote it directly or tell the employee it exists.`;

    // Build messages for OpenAI
    const messages = [
      { role: 'system', content: systemPrompt },
      ...previousMessages.slice(-6).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage }
    ];

    let responseText: string;

    if (openAIApiKey) {
      try {
        const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages,
            temperature: 0.5,
            max_tokens: 500,
          }),
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          responseText = aiData.choices[0].message.content;
        } else {
          responseText = buildFallbackResponse(userMessage, context);
        }
      } catch (_e) {
        responseText = buildFallbackResponse(userMessage, context);
      }
    } else {
      responseText = buildFallbackResponse(userMessage, context);
    }

    return new Response(
      JSON.stringify({ response: responseText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in career-coach-ai:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildFallbackResponse(userMessage: string, context: CoachRequest['context']): string {
  const lower = userMessage.toLowerCase();
  const { currentRole, matchedPathway, nextPathway, performanceAvg, assessedSkills, lengthOfService } = context;

  if (lower.includes('next role') || lower.includes('progress') || lower.includes('advance') || lower.includes('promotion')) {
    if (nextPathway) {
      const howToGet = nextPathway.howDoIGetThere
        ? `\n\nTo get there: ${nextPathway.howDoIGetThere}`
        : '';
      const skills = nextPathway.skills.length > 0
        ? `\n\nKey skills needed: ${nextPathway.skills.slice(0, 5).join(', ')}`
        : '';
      return `Based on your role profile, your natural progression from ${currentRole} is to **${nextPathway.title}** (${nextPathway.level}).${howToGet}${skills}\n\nWould you like to explore what gaps exist between your current skills and the requirements for this role?`;
    }
    if (matchedPathway?.progressionTo) {
      return `Your pathway indicates progression towards ${matchedPathway.progressionTo}. ${matchedPathway.howDoIGetThere || 'Speak with your manager to discuss a development plan aligned to that role.'}\n\nWould you like to understand what skills and experience you need to build?`;
    }
    return `Your current role is ${currentRole}. I don't have a next role profile configured in the pathways yet. Speak with your manager or check the Explore Careers section to see what roles are available in your department.`;
  }

  if (lower.includes('skill') || lower.includes('gap') || lower.includes('develop')) {
    if (matchedPathway && nextPathway) {
      const currentSkills = new Set(assessedSkills.map(s => s.toLowerCase()));
      const neededSkills = nextPathway.skills.filter(s => !currentSkills.has(s.toLowerCase()));
      if (neededSkills.length > 0) {
        return `To progress from ${currentRole} to ${nextPathway.title}, you should focus on developing: **${neededSkills.slice(0, 5).join(', ')}**.\n\n${nextPathway.howDoIGetThere || 'Check with your manager about training and stretch assignments that build these skills.'}`;
      }
    }
    if (matchedPathway?.howDoIGetThere) {
      return `Based on your role profile: ${matchedPathway.howDoIGetThere}`;
    }
    return `I don't have enough skill assessment data yet to identify specific gaps. You can ask your manager to complete a skills matrix review, or explore the Skills & Competencies section.`;
  }

  if (lower.includes('performance') || lower.includes('rating')) {
    if (performanceAvg !== null) {
      const level = performanceAvg >= 4.5 ? 'exceptional' : performanceAvg >= 3.5 ? 'strong' : performanceAvg >= 2.5 ? 'meeting expectations' : 'developing';
      return `Your average performance rating from completed reviews is **${performanceAvg.toFixed(2)}/5** (${level}). ${performanceAvg >= 4 ? `This is a solid foundation for progression. To make a case for moving to ${nextPathway?.title || 'the next level'}, you'll want to evidence your impact clearly in reviews.` : 'Focus on building consistent evidence of impact in your day-to-day role before making a case for progression.'}`;
    }
    return `You don't have completed review data yet. Your performance rating is built from your monthly review scores — speak with your manager to ensure your reviews are being completed.`;
  }

  if (lower.includes('how long') || lower.includes('ready') || lower.includes('when')) {
    const perfNote = performanceAvg !== null ? ` Your current performance average is ${performanceAvg.toFixed(2)}/5.` : '';
    return `You have ${lengthOfService} of service.${perfNote} Readiness for progression depends on consistently demonstrating the skills and accountabilities of your current role, plus evidence you are already operating at the next level in some areas.\n\n${matchedPathway?.howDoIGetThere || 'Discuss a timeline with your manager based on your development plan.'}`;
  }

  if (lower.includes('what great') || lower.includes('excellent') || lower.includes('stand out')) {
    if (matchedPathway?.whatGreatLooksLike?.length) {
      return `In your current role (${matchedPathway.title}), great performance looks like:\n• ${matchedPathway.whatGreatLooksLike.slice(0, 4).join('\n• ')}`;
    }
  }

  // Default
  const nextRoleName = nextPathway?.title;
  return `I'm here to give you specific career guidance based on your role profile and pathway data.\n\nFor ${currentRole}${nextRoleName ? ` (with ${nextRoleName} as your natural next step)` : ''}, I can help with:\n- What your next role looks like and how to get there\n- Skills and experience gaps to close\n- What "great" looks like in your current role\n- How your performance ratings reflect readiness\n\nWhat would you like to explore?`;
}
