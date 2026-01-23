import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // First verify the caller is an admin using anon key + their token
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user: callerUser }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !callerUser) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role to check if caller is admin
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: callerMember, error: memberError } = await supabaseAdmin
      .from('team_members')
      .select(`
        id,
        role_id,
        job_roles:role_id (name)
      `)
      .eq('auth_user_id', callerUser.id)
      .single();

    if (memberError || !callerMember) {
      console.error('Member lookup error:', memberError);
      return new Response(
        JSON.stringify({ error: 'User not found in team_members' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const roleName = (callerMember.job_roles as any)?.name?.toLowerCase() || '';
    if (!roleName.includes('admin') && roleName !== 'administrador') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { action, email, password, team_member_id, auth_user_id } = body;

    console.log('Admin action:', action, 'by user:', callerUser.email);

    // Handle different actions
    switch (action) {
      case 'create_user': {
        if (!email || !password || !team_member_id) {
          return new Response(
            JSON.stringify({ error: 'email, password, and team_member_id are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if team_member already has auth_user_id
        const { data: existingMember } = await supabaseAdmin
          .from('team_members')
          .select('auth_user_id, email')
          .eq('id', team_member_id)
          .single();

        if (existingMember?.auth_user_id) {
          return new Response(
            JSON.stringify({ error: 'Este membro já tem uma conta de autenticação vinculada' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create auth user
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true, // Auto-confirm email
        });

        if (createError) {
          console.error('Create user error:', createError);
          return new Response(
            JSON.stringify({ error: createError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Link to team_member
        const { error: updateError } = await supabaseAdmin
          .from('team_members')
          .update({ 
            auth_user_id: newUser.user.id,
            email: email 
          })
          .eq('id', team_member_id);

        if (updateError) {
          console.error('Update member error:', updateError);
          // Try to delete the created user
          await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
          return new Response(
            JSON.stringify({ error: 'Erro ao vincular usuário ao membro' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Created and linked user:', email, 'to member:', team_member_id);

        return new Response(
          JSON.stringify({ 
            success: true, 
            user_id: newUser.user.id,
            message: 'Usuário criado e vinculado com sucesso' 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'link_user': {
        if (!auth_user_id || !team_member_id) {
          return new Response(
            JSON.stringify({ error: 'auth_user_id and team_member_id are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if team_member already has auth_user_id
        const { data: existingMember } = await supabaseAdmin
          .from('team_members')
          .select('auth_user_id')
          .eq('id', team_member_id)
          .single();

        if (existingMember?.auth_user_id) {
          return new Response(
            JSON.stringify({ error: 'Este membro já tem uma conta vinculada' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if auth_user_id is already linked to another member
        const { data: linkedMember } = await supabaseAdmin
          .from('team_members')
          .select('id, name')
          .eq('auth_user_id', auth_user_id)
          .single();

        if (linkedMember) {
          return new Response(
            JSON.stringify({ error: `Esta conta já está vinculada a: ${linkedMember.name}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Link
        const { error: updateError } = await supabaseAdmin
          .from('team_members')
          .update({ auth_user_id })
          .eq('id', team_member_id);

        if (updateError) {
          console.error('Link error:', updateError);
          return new Response(
            JSON.stringify({ error: 'Erro ao vincular' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Conta vinculada com sucesso' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'unlink_user': {
        if (!team_member_id) {
          return new Response(
            JSON.stringify({ error: 'team_member_id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error: updateError } = await supabaseAdmin
          .from('team_members')
          .update({ auth_user_id: null })
          .eq('id', team_member_id);

        if (updateError) {
          console.error('Unlink error:', updateError);
          return new Response(
            JSON.stringify({ error: 'Erro ao desvincular' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Conta desvinculada com sucesso' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'reset_password': {
        if (!email) {
          return new Response(
            JSON.stringify({ error: 'email is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Send password reset email
        const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
          redirectTo: `${req.headers.get('origin')}/login`,
        });

        if (resetError) {
          console.error('Reset error:', resetError);
          return new Response(
            JSON.stringify({ error: resetError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Email de redefinição enviado' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
