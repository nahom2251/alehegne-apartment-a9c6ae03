import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, new_password } = await req.json();
    if (!email || !new_password || String(new_password).length < 6) {
      return new Response(JSON.stringify({ error: "Email and password (min 6 chars) required" }), { status: 400, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Find an approved request
    const { data: req_row } = await supabaseAdmin
      .from("password_reset_requests")
      .select("id, user_id, status")
      .ilike("email", email)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!req_row || !req_row.user_id) {
      return new Response(JSON.stringify({ error: "No approved reset request found. Please ask the super admin to approve your request." }), { status: 403, headers: corsHeaders });
    }

    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(req_row.user_id, { password: new_password });
    if (updErr) throw updErr;

    await supabaseAdmin.from("password_reset_requests")
      .update({ status: "used", used_at: new Date().toISOString() })
      .eq("id", req_row.id);

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
});