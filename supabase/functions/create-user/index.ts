import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CreateUserRequest {
  email: string;
  full_name: string;
  role: 'employee' | 'manager' | 'leadership' | 'admin';
  admin_type?: 'full_admin' | 'job_families_admin' | 'people_admin';
  job_title?: string;
  department?: string;
  start_date?: string;
  tenure?: number;
  manager_id?: string;
  job_family_id?: string;
  has_strategic_roadmap_access?: boolean;
  competency_level?: string;
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

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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

    const { data: adminProfile, error: adminProfileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', adminUser.id)
      .maybeSingle();

    if (adminProfileError || !adminProfile || adminProfile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestData: CreateUserRequest = await req.json();

    if (!requestData.email || !requestData.full_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, full_name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tempPassword = `TempPass${Math.random().toString(36).substring(2, 10)}!1`;

    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: requestData.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: requestData.full_name,
      },
    });

    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    const profileData: any = {
      id: authData.user.id,
      email: requestData.email,
      full_name: requestData.full_name,
      role: requestData.role || 'employee',
      job_title: requestData.job_title || null,
      department: requestData.department || null,
      start_date: requestData.start_date || null,
      tenure: requestData.tenure || 0,
      manager_id: requestData.manager_id || null,
      job_family_id: requestData.job_family_id || null,
      has_strategic_roadmap_access: requestData.has_strategic_roadmap_access || false,
      competency_level: requestData.competency_level || 'Employee',
      active: true,
    };

    if (requestData.role === 'admin' && requestData.admin_type) {
      profileData.admin_type = requestData.admin_type;
    }

    const { error: newProfileError } = await supabaseAdmin
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' });

    if (newProfileError) {
      console.error('Profile creation error:', newProfileError);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: `Failed to create profile: ${newProfileError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: authData.user.id,
          email: authData.user.email,
        },
        tempPassword: tempPassword,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error creating user:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
