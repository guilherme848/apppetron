import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/clint-create-client`;

Deno.test("rejects missing event_id", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_ANON_KEY}` },
    body: JSON.stringify({ organization_name: "Test" }),
  });
  const body = await res.json();
  assertEquals(res.status, 400);
  assertEquals(body.error, "Missing event_id");
});

Deno.test("rejects missing organization_name", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_ANON_KEY}` },
    body: JSON.stringify({ event_id: "test-no-name-" + Date.now() }),
  });
  const body = await res.json();
  assertEquals(res.status, 400);
  assertEquals(body.error, "Missing organization_name");
});

Deno.test("creates client successfully", async () => {
  const eventId = "test-create-" + Date.now();
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_ANON_KEY}` },
    body: JSON.stringify({
      event_id: eventId,
      organization_name: "Empresa Teste Webhook",
      contact_name: "João Silva",
      contact_email: "teste-webhook-" + Date.now() + "@example.com",
      contact_phone: "(11) 99999-0000",
      deal_stage: "Venda Fechada",
      deal_user: "Vendedor 1",
      deal_status: "Ganho",
    }),
  });
  const body = await res.json();
  assertEquals(res.status, 201);
  assertEquals(body.success, true);
  assertEquals(body.account_name, "Empresa Teste Webhook");

  // Test idempotency - same event_id should not create again
  const res2 = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_ANON_KEY}` },
    body: JSON.stringify({
      event_id: eventId,
      organization_name: "Empresa Teste Webhook",
    }),
  });
  const body2 = await res2.json();
  assertEquals(res2.status, 200);
  assertEquals(body2.message, "Event already processed");
});
