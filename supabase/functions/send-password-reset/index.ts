import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

/**
 * send-password-reset (no auth required — self-service flow)
 *
 * Called from the login page "Forgot password?" form.
 * Always returns a success response even if the email doesn't exist (security: no user enumeration).
 * If the account exists, sends a Supabase recovery email.
 * Logs the event regardless of whether the account was found.
 */
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null;
    const userAgent = req.headers.get('user-agent') || null;

    const origin =
      req.headers.get('origin') ||
      req.headers.get('referer')?.split('/').slice(0, 3).join('/') ||
      Deno.env.get('SITE_URL') ||
      'http://localhost:5173';

    // Check if account exists (do NOT reveal in response)
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const targetUser = users.find((u) => u.email?.toLowerCase() === normalizedEmail);

    if (targetUser) {
      // Account exists — send recovery email
      await supabaseAdmin.auth.resetPasswordForEmail(normalizedEmail, { redirectTo: origin });

      // Fetch profile for audit log
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', targetUser.id)
        .maybeSingle();

      await supabaseAdmin.from('security_audit_log').insert({
        event_type: 'password_reset_requested',
        actor_id: null,
        target_user_id: profile?.id || null,
        target_email: normalizedEmail,
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata: { source: 'self_service', reset_link_sent: true },
      });
    } else {
      // Log attempt even when account not found (for audit purposes, no PII stored)
      await supabaseAdmin.from('security_audit_log').insert({
        event_type: 'password_reset_requested',
        actor_id: null,
        target_user_id: null,
        target_email: normalizedEmail,
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata: { source: 'self_service', account_found: false },
      });
    }

    // Always return the same response — never reveal whether email exists
    return new Response(
      JSON.stringify({
        success: true,
        message: 'If an account with that email exists, a reset link has been sent.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-password-reset:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
