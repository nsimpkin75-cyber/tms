const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { competencyName, rating, comments, evidence, targetLevel } = await req.json();

    if (!competencyName || !rating || !comments) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // AI validation logic
    const commentWordCount = comments.split(/\s+/).length;
    const hasSpecificExamples = /example|instance|case|situation|when|demonstrated/.test(comments.toLowerCase());
    const hasQuantifiableResults = /\d+|increased|decreased|improved|achieved/.test(comments.toLowerCase());

    let validationStatus = 'validated';
    let feedback = 'Comments are sufficient to support this rating.';

    // Rating 4 requires substantial evidence
    if (rating === 4) {
      if (commentWordCount < 50) {
        validationStatus = 'needs_more_info';
        feedback = 'For a rating of 4 (consistently exceeds expectations), please provide more detailed comments (at least 50 words) with specific examples of going above and beyond.';
      } else if (!evidence || evidence.length < 20) {
        validationStatus = 'needs_more_info';
        feedback = 'Rating of 4 requires concrete evidence. Please provide specific examples of consistently exceeding expectations.';
      } else if (!hasSpecificExamples) {
        validationStatus = 'needs_more_info';
        feedback = 'Please include specific examples or situations that demonstrate exceptional performance.';
      } else if (!hasQuantifiableResults) {
        validationStatus = 'needs_more_info';
        feedback = 'Please include quantifiable results or measurable impact to support this exceptional rating.';
      }
    }

    // Rating 3 should have reasonable justification
    else if (rating === 3) {
      if (commentWordCount < 20) {
        validationStatus = 'needs_more_info';
        feedback = 'Please provide more details (at least 20 words) to justify this rating.';
      }
    }

    // Rating 1-2 should explain what needs improvement
    else if (rating <= 2) {
      if (commentWordCount < 30) {
        validationStatus = 'needs_more_info';
        feedback = 'For development ratings, please provide detailed feedback on what needs to improve and how.';
      }
      if (!/improve|develop|work on|focus on|need|should/.test(comments.toLowerCase())) {
        validationStatus = 'needs_more_info';
        feedback = 'Please include specific areas for improvement and development suggestions.';
      }
    }

    return new Response(
      JSON.stringify({
        validation_status: validationStatus,
        feedback,
        word_count: commentWordCount,
        has_specific_examples: hasSpecificExamples,
        has_quantifiable_results: hasQuantifiableResults
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});