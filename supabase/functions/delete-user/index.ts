import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DeleteUserRequest {
  userId: string;
  force?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing environment variables");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: authError?.message || "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role, admin_type")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile || profile.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Only admins can delete users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: DeleteUserRequest = await req.json();
    const { userId, force = false } = body;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (userId === user.id) {
      return new Response(
        JSON.stringify({ error: "You cannot delete yourself" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has any historical data that must be preserved
    const [reviewsRes, meetingsRes, checkinsRes] = await Promise.all([
      supabaseAdmin
        .from("one_to_one_monthly_reviews")
        .select("id", { count: "exact", head: true })
        .eq("employee_id", userId),
      supabaseAdmin
        .from("one_to_one_scheduled_meetings")
        .select("id", { count: "exact", head: true })
        .eq("employee_id", userId),
      supabaseAdmin
        .from("one_to_one_weekly_checkins")
        .select("id", { count: "exact", head: true })
        .eq("employee_id", userId),
    ]);

    const hasHistoricalData =
      (reviewsRes.count ?? 0) > 0 ||
      (meetingsRes.count ?? 0) > 0 ||
      (checkinsRes.count ?? 0) > 0;

    if (hasHistoricalData && !force) {
      // Soft delete: archive the user, preserve all historical data
      const { error: archiveError } = await supabaseAdmin
        .from("profiles")
        .update({ active: false })
        .eq("id", userId);

      if (archiveError) {
        console.error("Error archiving user:", archiveError);
        return new Response(
          JSON.stringify({ error: `Failed to archive user: ${archiveError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Clear manager references so their direct reports aren't orphaned
      await supabaseAdmin
        .from("profiles")
        .update({ manager_id: null })
        .eq("manager_id", userId);

      return new Response(
        JSON.stringify({
          success: true,
          archived: true,
          message: "User archived successfully. Historical review and meeting data has been preserved.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No historical data — safe to hard delete
    // Clear NO ACTION foreign key references first
    await Promise.all([
      supabaseAdmin.from("goal_actions").update({ assigned_to: null }).eq("assigned_to", userId),
      supabaseAdmin.from("strategic_goals").update({ owner_id: null }).eq("owner_id", userId),
      supabaseAdmin.from("review_notifications").update({ sender_id: null }).eq("sender_id", userId),
      supabaseAdmin.from("performance_ratings").delete().eq("rater_id", userId),
      supabaseAdmin.from("rating_approval_workflow").delete().eq("approver_id", userId),
      supabaseAdmin.from("review_kpi_templates").delete().eq("created_by", userId),
      supabaseAdmin.from("review_kpis").delete().eq("created_by", userId),
      supabaseAdmin.from("review_monthly_sessions").delete().eq("manager_id", userId),
      supabaseAdmin.from("review_rating_approvals").delete().or(`manager_id.eq.${userId},approver_id.eq.${userId}`),
      supabaseAdmin.from("review_six_month_performance").delete().or(`manager_id.eq.${userId},approved_by.eq.${userId}`),
      supabaseAdmin.from("review_weekly_checkins").delete().eq("manager_id", userId),
      supabaseAdmin.from("skill_assessments").delete().eq("assessed_by", userId),
      supabaseAdmin.from("user_admin_permissions").delete().eq("granted_by", userId),
    ]);

    // Clear self-referential manager_id
    await supabaseAdmin
      .from("profiles")
      .update({ manager_id: null })
      .eq("manager_id", userId);

    // Hard delete from auth (cascades profile and CASCADE-linked data)
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      console.error("Error deleting auth user:", deleteAuthError);
      return new Response(
        JSON.stringify({ error: `Failed to delete user: ${deleteAuthError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, archived: false, message: "User deleted successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in delete-user function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
