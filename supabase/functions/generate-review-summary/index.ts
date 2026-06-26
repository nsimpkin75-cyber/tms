import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { prompt, type } = body as { prompt?: string; type?: string };

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Missing prompt" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openAIApiKey = Deno.env.get("OPENAI_API_KEY");

    let summary: string;

    if (openAIApiKey) {
      try {
        const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openAIApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  "You are an expert HR writing assistant helping managers write monthly 1:1 performance review summaries. " +
                  "Write in a clear, professional, and warm tone. Use the manager's own words and specific examples from their comments. " +
                  "Do not invent information — only use what is provided. Do not use corporate jargon. " +
                  "Format using markdown bold headings (**Heading**) and bullet points where specified.",
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.4,
            max_tokens: 900,
          }),
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          summary = aiData.choices?.[0]?.message?.content?.trim() || buildFallbackFromPrompt(prompt);
        } else {
          summary = buildFallbackFromPrompt(prompt);
        }
      } catch (_e) {
        summary = buildFallbackFromPrompt(prompt);
      }
    } else {
      summary = buildFallbackFromPrompt(prompt);
    }

    return new Response(
      JSON.stringify({ summary }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Fallback when no API key is available.
 * Extracts key data lines from the prompt text and builds a structured summary.
 */
function buildFallbackFromPrompt(prompt: string): string {
  const extract = (label: string): string => {
    const idx = prompt.indexOf(label);
    if (idx === -1) return "";
    const after = prompt.slice(idx + label.length);
    const end = after.search(/\n[A-Z_\*]{3,}/);
    return (end === -1 ? after : after.slice(0, end)).trim();
  };

  const kpiSection = extract("KPI PERFORMANCE:");
  const compSection = extract("MANAGER COMPETENCY COMMENTS");
  const newActions = extract("NEW ACTIONS AGREED THIS REVIEW:");
  const outstanding = extract("OUTSTANDING ACTIONS CARRIED OVER:");
  const context = extract("MANAGER ADDITIONAL CONTEXT:");

  const overall = (prompt.match(/OVERALL AVERAGE:\s*([^\n]+)/) || [])[1] || "N/A";
  const kpiAvg = (prompt.match(/KPI Average:\s*([^\n]+)/) || [])[1] || "N/A";
  const compAvg = (prompt.match(/Competency Average:\s*([^\n]+)/) || [])[1] || "N/A";
  const month = (prompt.match(/REVIEW MONTH:\s*([^\n]+)/) || [])[1] || "";

  const compLines = compSection
    .split("\n")
    .filter((l) => l.trim().startsWith("-"))
    .map((l) => l.trim());

  const kpiLines = kpiSection
    .split("\n")
    .filter((l) => l.trim().startsWith("-"))
    .map((l) => l.trim());

  const actionLines = [
    ...newActions.split("\n").filter((l) => l.trim().startsWith("-")),
    ...outstanding.split("\n").filter((l) => l.trim().startsWith("-")),
  ].map((l) => l.trim());

  return [
    `**Summary**`,
    `Monthly 1:1 review for ${month}.${context ? ` ${context}` : ""}`,
    "",
    `**What's going well**`,
    ...(compLines.length > 0
      ? compLines.filter((_, i) => i < 4)
      : ["- See competency evidence above."]),
    "",
    `**Areas to develop**`,
    ...(compLines.length > 0
      ? compLines.filter((_, i) => i >= 4).slice(0, 3)
      : ["- Review areas where ratings indicate development is needed."]),
    "",
    `**KPI Performance**`,
    ...(kpiLines.length > 0 ? kpiLines : ["- No KPI data recorded."]),
    "",
    `**Actions for next month**`,
    ...(actionLines.length > 0 ? actionLines : ["- No actions recorded."]),
    "",
    `**Overall**`,
    `KPI avg: ${kpiAvg}. Competency avg: ${compAvg}. Overall avg: ${overall}.`,
  ].join("\n");
}
