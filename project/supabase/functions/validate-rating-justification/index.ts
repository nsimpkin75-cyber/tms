import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ValidationRequest {
  rating: number;
  ratingType: "kpi" | "competency";
  ratingLabel: string;
  managerComments: string;
  employeeName: string;
  competencyName?: string;
  competencyStatement?: string;
  whatGoodLooksLike?: string;
  whatGreatLooksLike?: string;
  kpiName?: string;
  targetValue?: string;
  actualValue?: string;
  seraSystemPrompt?: string;
}

/**
 * Extract bullet points from a named section inside competencyStatement.
 * e.g. extractSection("Responses to Avoid\n\n• Foo\n• Bar\n\nEvidence...", "Responses to Avoid")
 * returns ["Foo", "Bar"]
 */
function extractSection(text: string, heading: string): string[] {
  const idx = text.indexOf(heading);
  if (idx === -1) return [];
  const after = text.slice(idx + heading.length);
  const nextHeading = after.search(/\n[A-Z][^\n]{3,}\n/);
  const block = nextHeading === -1 ? after : after.slice(0, nextHeading);
  return block
    .split('\n')
    .map(l => l.replace(/^[•\-*]\s*/, '').trim())
    .filter(l => l.length > 5);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
    const body: ValidationRequest = await req.json();
    const {
      rating, ratingType, ratingLabel, managerComments, employeeName,
      competencyName, competencyStatement, whatGoodLooksLike, whatGreatLooksLike,
      kpiName, targetValue, actualValue, seraSystemPrompt,
    } = body;

    const itemName = ratingType === "kpi" ? kpiName : competencyName;
    const needsModeration = rating >= 4;
    const comments = managerComments || "";

    // Extract guidance examples from the competency statement (hidden from visible form)
    const responsesToAvoid = competencyStatement
      ? extractSection(competencyStatement, "Responses to Avoid")
      : [];
    const evidenceExamples = competencyStatement
      ? extractSection(competencyStatement, "Evidence Based Responses")
      : [];

    // Build tier-specific instruction for SERA prompt
    let tierInstruction: string;
    if (rating <= 3) {
      tierInstruction = `The manager selected ${rating}/5 (${ratingLabel}). Provide brief supportive coaching only. If evidence is present, acknowledge positively. If missing, gently encourage adding a note. 1-2 sentences max. Do NOT challenge this score.`;
    } else if (rating === 4) {
      tierInstruction = `The manager selected 4/5 (${ratingLabel} — Exceeding Expectations). Review evidence quality. If strong with specific outcomes, confirm it looks good. If vague, suggest one concrete improvement. 2-3 sentences. Supportive but constructive.`;
    } else {
      tierInstruction = `The manager selected 5/5 (${ratingLabel} — Exceptional). This enters executive moderation. Apply rigorous scrutiny. Generic statements like "customers are happy", "exceeded KPIs", "team can depend on me" are NOT sufficient alone. Strong level 5 evidence must show: measurable business impact (time/cost savings, revenue, efficiency), multiple sustained examples, contribution beyond normal role. If weak: clearly state it does not support a 5/5, explain what is missing, remind that executive reviewers expect measurable business impact. If strong: acknowledge clearly. Be direct. 2-4 sentences.`;
    }

    const systemPrompt = (seraSystemPrompt
      ? `${seraSystemPrompt}\n\n---\nFor this evaluation:\n${tierInstruction}`
      : `You are SERA, an AI performance coaching assistant for a talent management system. Be direct, professional, supportive but honest.\n\n${tierInstruction}`) +
      `\n\nRespond with JSON only, no markdown:\n{"valid": boolean, "confidence": "high"|"medium"|"low", "message": "feedback for the manager (1-3 sentences)", "prompt": "improvement suggestion or null", "summary": "summary for approvers or null"}`;

    const contextLines = [
      `Employee: ${employeeName}`,
      `Competency: ${itemName || "Unknown"}`,
      competencyStatement ? `Full competency guidance (use to evaluate quality of evidence):\n${competencyStatement}` : null,
      whatGoodLooksLike ? `What good (On Target) looks like:\n${whatGoodLooksLike}` : null,
      whatGreatLooksLike ? `What exceptional looks like:\n${whatGreatLooksLike}` : null,
      targetValue ? `Target: ${targetValue}` : null,
      actualValue ? `Actual: ${actualValue}` : null,
      `Rating selected: ${rating}/5 (${ratingLabel})`,
      `Manager evidence submitted: "${comments || "(none provided)"}"`,
    ].filter(Boolean).join("\n\n");

    const userPrompt = `${contextLines}\n\nUsing the competency guidance above, evaluate whether the manager's evidence genuinely supports the selected rating. Reference the "Responses to Avoid" and "Evidence Based Responses" sections when assessing quality.`;

    // Try OpenAI if key is available
    if (openAIApiKey) {
      try {
        const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${openAIApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
            temperature: 0.3,
            max_tokens: 350,
            response_format: { type: "json_object" },
          }),
        });
        if (aiRes.ok) {
          const aiData = await aiRes.json();
          const result = JSON.parse(aiData.choices[0].message.content);
          return new Response(
            JSON.stringify({ ...result, needsModeration }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (_e) {
        // fall through to heuristic
      }
    }

    // Heuristic evaluation — runs when no OpenAI key
    const len = comments.trim().length;
    const hasLength = len > 20;
    const hasMeasurable = /\d+|\b(percent|%|hours?|days?|weeks?|months?|saving|revenue|cost|reduc|improv|increas|efficien|deliver|achiev|complet|exceed|automat|launch|deploy)\b/i.test(comments);
    const hasMultipleExamples = (comments.match(/[.!]/g) || []).length >= 2;

    // Check if evidence matches known "Responses to Avoid" patterns from competency guidance
    const commentLower = comments.toLowerCase().trim();
    const matchesAvoidPattern = responsesToAvoid.some(avoid =>
      avoid.length > 10 && commentLower.includes(avoid.toLowerCase().slice(0, 30))
    );

    // Check if evidence resembles a strong evidence example
    const resemblesGoodExample = evidenceExamples.some(ex =>
      ex.length > 20 && (
        /\d+/.test(comments) ||
        /reduc|improv|deliver|automat|launch|merchant|revenue|saving/i.test(comments)
      )
    );

    let valid: boolean;
    let confidence: string;
    let message: string;
    let prompt: string | null = null;
    let summary: string | null = null;

    if (rating <= 3) {
      valid = true;
      confidence = hasMeasurable ? "high" : hasLength ? "medium" : "low";
      const ratingWord = rating === 1 ? "Development Needed (1/5)" : "On Target (3/5)";
      if (!hasLength) {
        message = `Add specific evidence to support this ${ratingWord} rating for ${itemName}. Describe the behaviours you observed and a concrete example — even a brief note makes the rating more credible and useful for the employee.`;
      } else if (matchesAvoidPattern) {
        message = `The evidence reads as a general statement rather than specific observed behaviour. To make this ${ratingWord} rating meaningful, reference a particular action, situation, or outcome — see the evidence guidance for examples of what strong evidence looks like.`;
      } else if (!hasMeasurable && rating === 3) {
        message = `Evidence is present — good start. To strengthen this On Target (3/5) rating, consider adding a concrete outcome or example: what specifically did ${employeeName} do, and what was the result? This makes the feedback more actionable.`;
      } else if (!hasMeasurable && rating === 1) {
        message = `Evidence is noted for this Development Needed (1/5) rating. For the feedback to be actionable, describe the specific gap observed: what behaviour or outcome fell short, and what does improvement look like for ${employeeName}?`;
      } else {
        message = rating === 1
          ? `Evidence clearly supports this Development Needed rating. The feedback is specific enough to be actionable. Ensure ${employeeName} has a clear development plan linked to this area.`
          : `Good — evidence supports this On Target rating for ${itemName}. The examples are specific and observable. Consider whether there are any areas within this competency that could move ${employeeName} toward Exceptional.`;
      }
    } else if (rating === 4) {
      valid = hasLength && hasMeasurable;
      confidence = valid ? "medium" : "low";
      if (!hasLength) {
        message = `Please add specific evidence to support a 4/5 rating for "${itemName}" — describe what the employee did and the outcome.`;
        prompt = `To support a 4/5 rating for ${itemName}, provide a specific example with a measurable outcome.`;
      } else if (matchesAvoidPattern) {
        message = `This reads like a generic statement. For a 4/5 rating, SERA needs to see specific outcomes — what did the employee actually do, and what was the result?`;
        prompt = `Replace general statements with specific examples: what did ${employeeName} deliver, and what was the measurable impact for ${itemName}?`;
      } else if (!hasMeasurable) {
        message = "The evidence could be stronger — try including a measurable outcome or concrete result to support this exceeding-expectations rating.";
        prompt = `Add a measurable outcome to strengthen this 4/5 rating for ${itemName} (e.g. time saved, improvement achieved, specific result delivered).`;
      } else {
        message = "Evidence looks reasonable for a 4/5 rating. This will go to moderation for approval.";
      }
      summary = needsModeration ? `${employeeName} rated ${rating}/5 for ${itemName}. ${comments.substring(0, 120)}` : null;
    } else {
      // Rating 5 — rigorous
      if (!hasLength) {
        valid = false;
        confidence = "low";
        message = "No evidence provided. A 5/5 rating requires detailed, measurable evidence demonstrating sustained exceptional contribution. This will not be supported in moderation without it.";
        prompt = `Provide specific evidence for a 5/5 rating for ${itemName}: include measurable business impact (time/cost savings, revenue, efficiency), multiple examples, and contribution beyond normal role expectations.`;
      } else if (matchesAvoidPattern && !resemblesGoodExample) {
        valid = false;
        confidence = "low";
        message = `This evidence matches the types of responses to avoid for this competency. A 5/5 rating requires specific, outcome-based evidence — not general statements about support or effort.`;
        prompt = `Rewrite the evidence for ${itemName} to include specific actions, measurable results, and examples that go beyond the standard role expectations.`;
      } else if (!hasMeasurable) {
        valid = false;
        confidence = "low";
        message = `The evidence doesn't yet include measurable outcomes. A 5/5 rating entering executive moderation needs to demonstrate tangible business impact — numbers, savings, efficiencies, or results that go beyond expected role performance.`;
        prompt = `Add measurable results to support this 5/5 rating for ${itemName}: quantify the impact where possible (e.g. reduced X by Y%, saved Z hours per week).`;
      } else if (!hasMultipleExamples) {
        valid = false;
        confidence = "medium";
        message = `One example has been provided. A 5/5 rating should be supported by multiple examples demonstrating sustained exceptional contribution across the review period. Executive moderation will expect to see consistent evidence of impact.`;
        prompt = `Add additional examples to support a 5/5 rating for ${itemName} — demonstrate sustained impact across the review period, not just a single instance.`;
      } else {
        valid = true;
        confidence = "high";
        message = `Strong evidence provided demonstrating measurable impact. This supports a 5/5 rating and will enter executive moderation for approval.`;
      }
      summary = `${employeeName} rated 5/5 for ${itemName}. ${comments.substring(0, 150)}`;
    }

    return new Response(
      JSON.stringify({ valid, confidence, message, prompt, summary, needsModeration }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in validate-rating-justification:", error);
    return new Response(
      JSON.stringify({
        valid: false,
        confidence: "low",
        message: "Unable to validate at this time. Please ensure comments are detailed.",
        prompt: "Please add specific, evidence-based comments to support this rating.",
        summary: null,
        needsModeration: true,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
