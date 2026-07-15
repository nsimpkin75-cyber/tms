import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

/**
 * reset-user-password
 *
 * mode = 'email' (default): sends Supabase recovery email. Does NOT set must_change_password.
 * mode = 'admin': generates a new temp password, sets must_change_password = true, returns tempPassword.
 */
interface ResetRequest {
  email: string;
  mode?: 'email' | 'admin';
}

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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: adminUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !adminUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: adminProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, full_name')
      .eq('id', adminUser.id)
      .maybeSingle();

    if (profileError || !adminProfile || adminProfile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: ResetRequest = await req.json();
    const { email, mode = 'email' } = body;

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Look up target user
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;
    const targetAuthUser = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

    if (!targetAuthUser) {
      return new Response(
        JSON.stringify({ error: `No account found for ${email}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch target profile
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .eq('id', targetAuthUser.id)
      .maybeSingle();

    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null;
    const userAgent = req.headers.get('user-agent') || null;

    if (mode === 'admin') {
      // Generate temp password, set must_change_password = true
      const tempPassword = `TempPass${crypto.randomUUID().replace(/-/g, '').substring(0, 8)}!1`;

      const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
        targetAuthUser.id,
        { password: tempPassword }
      );
      if (updateAuthError) throw updateAuthError;

      const { error: profileUpdateError } = await supabaseAdmin
        .from('profiles')
        .update({ must_change_password: true })
        .eq('id', targetAuthUser.id);
      if (profileUpdateError) throw profileUpdateError;

      // Audit log
      await supabaseAdmin.from('security_audit_log').insert({
        event_type: 'admin_password_reset',
        actor_id: adminUser.id,
        target_user_id: targetAuthUser.id,
        target_email: email,
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata: {
          reset_by_name: adminProfile.full_name,
          mode: 'admin',
          must_change_password_set: true,
        },
      });

      return new Response(
        JSON.stringify({ success: true, tempPassword, mode: 'admin' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // mode = 'email' — send recovery link via Supabase
    const origin =
      req.headers.get('origin') ||
      req.headers.get('referer')?.split('/').slice(0, 3).join('/') ||
      Deno.env.get('SITE_URL') ||
      'http://localhost:5173';

    const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: origin,
    });

    if (resetError) {
      return new Response(
        JSON.stringify({ error: `Failed to send reset email: ${resetError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Audit log
    await supabaseAdmin.from('security_audit_log').insert({
      event_type: 'admin_password_reset',
      actor_id: adminUser.id,
      target_user_id: targetProfile?.id || null,
      target_email: email,
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata: {
        reset_by_name: adminProfile.full_name,
        mode: 'email',
        reset_link_sent: true,
      },
    });

    return new Response(
      JSON.stringify({ success: true, message: 'Password reset email sent', mode: 'email' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in reset-user-password:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
