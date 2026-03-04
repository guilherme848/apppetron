import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function unauthorized() {
  return json({ error: "Unauthorized" }, 401);
}

function badRequest(msg: string) {
  return json({ error: msg }, 400);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ── Auth via x-api-key header ──
  const apiKey = req.headers.get("x-api-key");
  const expected = Deno.env.get("EXTERNAL_API_KEY");
  if (!apiKey || apiKey !== expected) {
    return unauthorized();
  }

  // ── Supabase admin client ──
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);
  const segments = url.pathname.replace(/^\/external-api\/?/, "").split("/").filter(Boolean);
  // segments: [resource] or [resource, id]
  const resource = segments[0] || "";
  const id = segments[1] || null;

  if (!["accounts", "team_members"].includes(resource)) {
    return badRequest(
      `Invalid resource "${resource}". Use "accounts" or "team_members".`
    );
  }

  const table = resource; // same name as DB table

  try {
    // ── GET (list or single) ──
    if (req.method === "GET") {
      if (id) {
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .eq("id", id)
          .single();
        if (error) return json({ error: error.message }, 404);
        return json(data);
      }

      // List with optional filters via query params
      let query = supabase.from(table).select("*");

      // Support ?status=active, ?active=true, etc.
      for (const [key, value] of url.searchParams.entries()) {
        if (["limit", "offset", "order"].includes(key)) continue;
        query = query.eq(key, value);
      }

      const limit = parseInt(url.searchParams.get("limit") || "100");
      const offset = parseInt(url.searchParams.get("offset") || "0");
      query = query.range(offset, offset + limit - 1);

      const orderCol = url.searchParams.get("order") || "created_at";
      query = query.order(orderCol, { ascending: false });

      const { data, error } = await query;
      if (error) return json({ error: error.message }, 500);
      return json(data);
    }

    // ── POST (create) ──
    if (req.method === "POST") {
      const body = await req.json();
      const { data, error } = await supabase
        .from(table)
        .insert(body)
        .select()
        .single();
      if (error) return json({ error: error.message }, 422);
      return json(data, 201);
    }

    // ── PATCH (update) ──
    if (req.method === "PATCH") {
      if (!id) return badRequest("ID is required for PATCH");
      const body = await req.json();
      const { data, error } = await supabase
        .from(table)
        .update(body)
        .eq("id", id)
        .select()
        .single();
      if (error) return json({ error: error.message }, 422);
      return json(data);
    }

    // ── DELETE ──
    if (req.method === "DELETE") {
      if (!id) return badRequest("ID is required for DELETE");
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) return json({ error: error.message }, 422);
      return json({ success: true });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (err) {
    return json({ error: err.message }, 500);
  }
});
